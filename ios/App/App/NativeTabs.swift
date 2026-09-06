import UIKit
import Capacitor

final class LifeSwapBridgeViewController: CAPBridgeViewController {
    let tabsPlugin = NativeTabsPlugin()

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(tabsPlugin)
    }
}

@objc(NativeTabsPlugin)
public class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeTabsPlugin"
    public let jsName = "NativeTabs"
    public let pluginMethods = [CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise)]
    weak var host: LifeSwapTabController?

    @objc func configure(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let host = self?.host else {
                call.reject("Native tab host unavailable")
                return
            }
            host.configure(visible: call.getBool("visible") ?? false,
                           selected: call.getString("selected") ?? "home",
                           unread: call.getBool("unread") ?? false,
                           theme: call.getString("theme") ?? "system")
            call.resolve(["available": true])
        }
    }
}

// One Capacitor bridge is moved between lightweight tab hosts. React owns the
// navigation state; UIKit owns the system tab bar and its glass material.
final class LifeSwapTabController: UITabBarController, UITabBarControllerDelegate {
    private let content = LifeSwapBridgeViewController()
    private let tabIDs = ["home", "explore", "messages", "account"]
    private var wantsVisible = false
    private var keyboardVisible = false
    private var lastInset: CGFloat = -1

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        let labels = ["Home", "Explore", "Messages", "Account"]
        let symbols = ["house", "magnifyingglass", "message", "person.crop.circle"]
        viewControllers = zip(labels, symbols).enumerated().map { index, pair in
            let controller = UIViewController()
            controller.tabBarItem = UITabBarItem(title: pair.0, image: UIImage(systemName: pair.1), tag: index)
            return controller
        }
        // Preserve the system appearance: iOS 26 supplies Liquid Glass; older
        // versions supply their standard native material.
        if #available(iOS 18.0, *) { mode = .tabBar }
        tabBar.isHidden = true
        content.tabsPlugin.host = self
        attachContent()
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged(_:)), name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardHidden), name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    private func attachContent() {
        guard let target = selectedViewController, content.parent !== target else { return }
        content.willMove(toParent: nil)
        content.view.removeFromSuperview()
        content.removeFromParent()
        target.addChild(content)
        target.view.addSubview(content.view)
        content.view.frame = target.view.bounds
        content.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        content.didMove(toParent: target)
    }

    func configure(visible: Bool, selected: String, unread: Bool, theme: String) {
        wantsVisible = visible
        overrideUserInterfaceStyle = theme == "dark" ? .dark : theme == "light" ? .light : .unspecified
        if let index = tabIDs.firstIndex(of: selected), selectedIndex != index {
            selectedIndex = index
            attachContent()
        }
        viewControllers?[2].tabBarItem.badgeValue = unread ? "•" : nil
        updateVisibility()
    }

    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        guard let index = viewControllers?.firstIndex(of: viewController) else { return false }
        content.tabsPlugin.notifyListeners("tabSelected", data: ["id": tabIDs[index]])
        // Account is an action opening the existing role-aware menu. All tab
        // selection is acknowledged by React so redirects stay synchronized.
        return false
    }

    @objc private func keyboardChanged(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let local = view.convert(frame, from: nil)
        keyboardVisible = local.intersects(view.bounds) && local.minY < view.bounds.maxY
        updateVisibility()
    }

    @objc private func keyboardHidden() {
        keyboardVisible = false
        updateVisibility()
    }

    private func updateVisibility() {
        tabBar.isHidden = !wantsVisible || keyboardVisible
        view.setNeedsLayout()
        view.layoutIfNeeded()
        publishInset()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        publishInset()
    }

    private func publishInset() {
        guard content.isViewLoaded else { return }
        let frame = content.view.convert(tabBar.bounds, from: tabBar)
        let inset = tabBar.isHidden ? 0 : max(0, content.view.bounds.maxY - frame.minY)
        guard inset != lastInset else { return }
        lastInset = inset
        content.tabsPlugin.notifyListeners("insetChanged", data: ["bottom": inset], retainUntilConsumed: true)
    }
}
