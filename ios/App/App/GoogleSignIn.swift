import AuthenticationServices
import Capacitor
import CryptoKit

// Native Google sign-in. Google refuses OAuth inside a WKWebView, but allows
// the system browser sheet (ASWebAuthenticationSession), so this runs the
// standard installed-app flow there: authorization code + PKCE against the
// iOS OAuth client, redirected back to its reversed-client-ID scheme. The
// resulting ID token goes to Firebase from the web layer, so no Google or
// Firebase SDK is linked into the app.
@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "GoogleSignInPlugin"
    public let jsName = "GoogleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]
    private var session: ASWebAuthenticationSession?

    @objc func authorize(_ call: CAPPluginCall) {
        let suffix = ".apps.googleusercontent.com"
        guard let clientId = call.getString("clientId"), clientId.hasSuffix(suffix) else {
            call.reject("Google sign-in is not configured", "unconfigured")
            return
        }
        let scheme = "com.googleusercontent.apps." + clientId.dropLast(suffix.count)
        let redirectURI = scheme + ":/oauth2redirect"
        let verifier = Self.randomURLSafe(32)
        let state = Self.randomURLSafe(16)
        let challenge = Self.base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account")
        ]

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let session = ASWebAuthenticationSession(url: components.url!, callbackURLScheme: scheme) { [weak self] url, error in
                self?.session = nil
                if let error {
                    let canceled = (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin
                    call.reject(error.localizedDescription, canceled ? "canceled" : "failed", error)
                    return
                }
                let items = url.flatMap { URLComponents(url: $0, resolvingAgainstBaseURL: false)?.queryItems } ?? []
                let value = { (name: String) in items.first { $0.name == name }?.value }
                guard value("state") == state, let code = value("code") else {
                    call.reject(value("error") ?? "Google did not return an authorization code", "failed")
                    return
                }
                Self.exchange(code: code, clientId: clientId, redirectURI: redirectURI, verifier: verifier, call: call)
            }
            session.presentationContextProvider = self
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("Could not open Google sign-in", "failed")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.webView?.window ?? ASPresentationAnchor()
    }

    private static func exchange(code: String, clientId: String, redirectURI: String, verifier: String, call: CAPPluginCall) {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var body = URLComponents()
        body.queryItems = [
            URLQueryItem(name: "grant_type", value: "authorization_code"),
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "code_verifier", value: verifier)
        ]
        request.httpBody = body.percentEncodedQuery?.data(using: .utf8)
        URLSession.shared.dataTask(with: request) { data, _, error in
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
            guard error == nil, let idToken = json["id_token"] as? String else {
                let reason = (json["error_description"] as? String) ?? error?.localizedDescription ?? "Token exchange failed"
                call.reject(reason, "failed")
                return
            }
            call.resolve(["idToken": idToken, "accessToken": json["access_token"] as? String ?? ""])
        }.resume()
    }

    private static func randomURLSafe(_ count: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: count)
        _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        return base64URL(Data(bytes))
    }

    private static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
