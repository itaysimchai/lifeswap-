import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedAPI, externalURL, checkoutURL } from '../mobile/policy.ts';
test('native backend accepts only the two supported authenticated operations',()=>{assert.equal(allowedAPI('/api/bookings/free'),true);assert.equal(allowedAPI('/api/cancel-booking'),true);for(const path of ['https://attacker.example','/api/paypal/capture-order','/api/bookings/free?redirect=x','/api/../admin'])assert.equal(allowedAPI(path),false);});
test('external links reject executable and local schemes',()=>{for(const url of ['javascript:alert(1)','file:///tmp','data:text/html,x','http://example.com'])assert.equal(externalURL(url),null);assert.equal(externalURL('https://example.com'),'https://example.com/');});
test('checkout always stays on the existing LifeSwap host',()=>{assert.equal(new URL(checkoutURL('//other.example')).host,'lifeswapp.netlify.app');assert.equal(new URL(checkoutURL('a/b')).pathname,'/services/a%2Fb');});
