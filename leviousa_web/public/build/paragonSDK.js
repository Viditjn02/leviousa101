var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@useparagon/connect/dist/src/index.js
var require_src = __commonJS({
  "node_modules/@useparagon/connect/dist/src/index.js"(exports, module) {
    (() => {
      var t = { 773: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.InstallFlow = e2.ExternalFilePicker = e2.PARAGON_OVERFLOW_EMPTY_VALUE = void 0;
        const i2 = n2(655), o = i2.__importDefault(n2(6245)), r = n2(3931), s = n2(4059), a = n2(745), l = n2(7343), d = n2(7050);
        Object.defineProperty(e2, "ExternalFilePicker", { enumerable: true, get: function() {
          return d.ExternalFilePicker;
        } });
        const c = n2(2643), u = n2(4429), h = i2.__importDefault(n2(9892)), p = n2(3821), g = n2(2460), f = n2(3158), E = n2(4846), v = n2(572), S = n2(8321), I = n2(3035), _ = "paragon-connect-frame", C = `${_}-container`, O = "paragon-connect-user-state";
        e2.PARAGON_OVERFLOW_EMPTY_VALUE = "PARAGON_OVERFLOW_EMPTY_VALUE";
        class y extends h.default {
          constructor(t3) {
            let n3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            if (super(), this.rootLoaded = false, this.isHeadless = false, this.rootElementCreated = false, this.modalState = { integration: null, onClose: this.onClose.bind(this), overlayStyle: { overflow: "auto" }, onOpen: this.onOpen.bind(this), apiInstallationOptions: { isApiInstallation: false, showPortalAfterInstall: false } }, this.userState = { authenticated: false }, this.loadedConfigs = {}, this.loadedIntegrations = {}, this.endUserIntegrationConfig = {}, this.metadata = {}, this.cachedApiResponse = new I.CacheThrottle({ ttl: 5e3 }), this.keyToRequestPromiseMap = {}, this.originalBodyOverflow = e2.PARAGON_OVERFLOW_EMPTY_VALUE, this.dynamicFieldMappingLoaders = {}, this.customDropdownOptionsLoaders = {}, "undefined" == typeof window) return void console.warn("connect sdk can only be used on browser");
            const i3 = (0, f.getAssetUrl)({ CDN_PUBLIC_URL: "https://cdn.useparagon.com", DASHBOARD_PUBLIC_URL: "https://dashboard.useparagon.com", NODE_ENV: "production", PLATFORM_ENV: "production", VERSION: "latest" });
            if (this.environments = { CDN_PUBLIC_URL: i3, CONNECT_PUBLIC_URL: "https://connect.useparagon.com", DASHBOARD_PUBLIC_URL: "https://dashboard.useparagon.com", HERMES_PUBLIC_URL: "https://hermes.useparagon.com", NODE_ENV: "production", PASSPORT_PRODUCTION_URL: "https://passport.useparagon.com", PASSPORT_PUBLIC_URL: "https://passport.useparagon.com", PLATFORM_ENV: "production", VERSION: "latest", WORKER_PROXY_PUBLIC_URL: "https://proxy.useparagon.com", ZEUS_PUBLIC_URL: "https://zeus.useparagon.com" }, this.userState = { authenticated: false }, "string" == typeof t3 ? this.configureGlobal({ host: t3 }) : this.environments = { ...this.environments, ...t3 }, !this.environments.CONNECT_PUBLIC_URL) throw new Error("Paragon SDK error! No `CONNECT_PUBLIC_URL` configured.");
            if (!this.environments.DASHBOARD_PUBLIC_URL) throw new Error("Paragon SDK error! No `DASHBOARD_PUBLIC_URL` configured.");
            if (!this.environments.PASSPORT_PUBLIC_URL) throw new Error("Paragon SDK error! No `PASSPORT_PUBLIC_URL` configured.");
            if (!this.environments.WORKER_PROXY_PUBLIC_URL) throw new Error("Paragon SDK error! No `WORKER_PROXY_PUBLIC_URL` configured.");
            if (!this.environments.ZEUS_PUBLIC_URL) throw new Error("Paragon SDK error! No `ZEUS_PUBLIC_URL` configured.");
            n3.skipBootstrapWithLastKnownState || this.loadState(), window.addEventListener("message", this.eventMessageHandler.bind(this)), window.document.readyState === p.DocumentLoadingState.LOADING ? window.document.addEventListener("DOMContentLoaded", (() => {
              this.createReactRoot();
            })) : this.createReactRoot(), this.installFlow = new m(this);
          }
          setHeadless(t3) {
            this.isHeadless = t3;
          }
          async eventMessageHandler(t3) {
            switch (t3.data.type) {
              case "oauth_success_callback":
                await this._oauthCallback(t3.data.credential);
                break;
              case "oauth_error_callback":
                await this._oauthErrorCallback(t3.data.error, t3);
                break;
              default:
                await this.functionInvocationHandler(t3);
            }
          }
          async functionInvocationHandler(t3) {
            if ("SDK_FUNCTION_INVOCATION" !== t3.data.messageType) return;
            const { type: e3, id: n3, parameters: i3 } = t3.data;
            let o2;
            try {
              o2 = { messageType: "SDK_FUNCTION_RESPONSE", id: n3, type: e3, result: await this[e3](...i3) };
            } catch (t4) {
              o2 = { messageType: "SDK_FUNCTION_ERROR", error: true, message: t4.message, id: n3 };
            }
            t3.source.postMessage(o2, this.environments.CONNECT_PUBLIC_URL);
          }
          createReactRoot() {
            var t3;
            if (this.rootElementCreated) return;
            this.rootElementCreated = true, this.root = document.createElement("iframe"), this.root.onload = () => {
              this.rootLoaded = true, this.render();
            };
            const e3 = !!document.querySelector(`#${C}`);
            this.root.id = _, this.root.src = `${this.environments.CONNECT_PUBLIC_URL}/ui${this.projectId ? `?projectId=${this.projectId}` : ""}`, this.root.style.position = e3 ? "absolute" : "fixed", this.root.style.top = "0", this.root.style.left = "0", this.root.style.width = e3 ? "100%" : "100vw", this.root.style.height = e3 ? "100%" : "100vh", this.root.style.zIndex = "2147483647", this.root.style.display = "none", null === (t3 = document.querySelector(`#${C}`) || document.body) || void 0 === t3 || t3.appendChild(this.root);
          }
          validateAction(t3) {
            var e3;
            if (!this.loadedIntegrations[t3] && !(0, l.isCustomIntegrationTypeName)(t3)) throw new Error(`"${t3}" is not a valid integration type. The integrations you have configured for this Paragon project are:

${Object.keys(this.loadedConfigs).map(((t4) => `- "${t4}"`)).join("\n")}
`);
            if (!this.loadedConfigs[t3] || !this.userState.integrations[t3]) throw new Error(`integration "${t3}" has not been set up in your Paragon project yet.

${Object.keys(this.loadedConfigs).map(((t4) => `- "${t4}"`)).join("\n")}`);
            if (!(null === (e3 = this.loadedIntegrations[t3]) || void 0 === e3 ? void 0 : e3.isActive)) throw new Error(`integration "${t3}" is not active in your Paragon project yet.`);
          }
          isAlreadyInstalled(t3, e3, n3) {
            var i3, o2;
            if (n3) {
              const t4 = this.getCredentialAndConfig({ selectedCredentialId: n3 });
              return (null === (i3 = null == t4 ? void 0 : t4.selectedCredential) || void 0 === i3 ? void 0 : i3.status) === s.CredentialStatus.VALID;
            }
            return Boolean(null === (o2 = e3.integrations[t3]) || void 0 === o2 ? void 0 : o2.enabled);
          }
          async bootstrapSDKState(t3) {
            this.projectId && this.userState.authenticated && await this.updateLocalState(t3);
          }
          setModalState(t3) {
            this.modalState = { config: void 0, ...this.modalState, ...t3 }, this.render();
          }
          loadState() {
            if ("undefined" != typeof window) try {
              const t3 = window.localStorage.getItem(O) ? JSON.parse(window.localStorage.getItem(O)) : {};
              if (t3.projectId && (this.projectId = t3.projectId), t3.userState) {
                const { userState: e3 } = t3;
                if (!("authenticated" in e3 && e3.authenticated && "token" in e3)) throw new Error("Malformatted or unauthenticated user was persisted into localStorage. Refusing to load.");
                this.updateAuthenticatedUser(e3), this.bootstrapSDKState().catch((() => {
                  this.clearState();
                }));
              }
            } catch {
              this.clearState();
            }
          }
          getIntegrationId(t3) {
            const e3 = this.loadedIntegrations[t3];
            if (!e3) throw new Error(`Integration "${t3}" not found`);
            return e3.id;
          }
          saveState() {
            "undefined" != typeof window && this.userState.authenticated && window.localStorage.setItem(O, JSON.stringify({ projectId: this.projectId, userState: this.userState }));
          }
          clearState() {
            "undefined" != typeof window && window.localStorage.removeItem(O);
          }
          render() {
            if (!this.isHeadless && this.root && this.rootLoaded) {
              const { onClose: t3, onOpen: e3, ...n3 } = this.modalState, i3 = { messageType: "UI_UPDATE", nextContext: { user: this.userState, projectId: this.projectId, environments: this.environments, project: this.project, endUserIntegrationConfig: this.modalState.integration ? this.endUserIntegrationConfig[(0, l.getIntegrationTypeName)(this.modalState.integration) || ""] : void 0 }, nextModalState: n3 };
              if (!this.root.contentWindow) throw new Error("Browser not supported");
              this.root.contentWindow.postMessage(i3, this.environments.CONNECT_PUBLIC_URL);
            }
          }
          updateContainerStyle(t3) {
            let { isModalShown: e3 } = t3;
            this.root && (this.root.style.display = e3 ? "block" : "none");
          }
          async authenticate(t3, e3, n3) {
            var i3;
            if (!t3 || !e3) throw new Error("projectId or token not specified to paragon.authenticate()");
            let r2 = {};
            try {
              r2 = (0, o.default)(e3);
            } catch (t4) {
              throw new Error("A well-formed JWT was not provided to paragon.authenticate()");
            }
            this.projectId = t3, this.userState = { authenticated: true, token: e3, userId: r2.sub || r2.id, integrations: {}, meta: null !== (i3 = null == n3 ? void 0 : n3.metadata) && void 0 !== i3 ? i3 : {}, resources: [] };
            try {
              if (Date.now() >= 1e3 * (r2.exp || 0)) throw new Error("JWT token provided has expired.");
              await this.bootstrapSDKState(null == n3 ? void 0 : n3.metadata);
            } catch (t4) {
              throw console.warn("paragon.authenticate() could not login user", t4), this.logout(), new Error(`Failed to authenticate user with Paragon: ${t4.message}`);
            }
            this.render();
          }
          getUser() {
            return Object.fromEntries(Object.entries(this.userState).filter(((t3) => {
              let [e3] = t3;
              return "token" !== e3;
            })));
          }
          updateAuthenticatedUser(t3) {
            this.userState.authenticated ? this.userState = { ...this.userState, ...t3 } : t3.authenticated && (this.userState = t3), this.render();
          }
          logout() {
            this.userState = { authenticated: false }, this.clearState(), this.render();
          }
          removeOptionDuplicates() {
            let t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
            if (!t3) return;
            const e3 = /* @__PURE__ */ new Set(), n3 = [];
            for (const i3 of t3) e3.has(i3.value) ? console.warn(`Duplicated key: "${i3.value}", Ignored: "${i3.label}"`) : (n3.push(i3), e3.add(i3.value));
            return n3;
          }
          startOAuthFlow(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
            var i3, o2;
            const r2 = this.getIntegrationByName(t3), s2 = (0, c.findSelectedAccountType)(null === (i3 = null == r2 ? void 0 : r2.sdkIntegrationConfig) || void 0 === i3 ? void 0 : i3.accountTypes, this.getAccountName(e3.accountType), this.getSelectedMultipleAccountTypes(e3.accountType)), l2 = { context: { user: this.userState, projectId: this.projectId, environments: this.environments, endUserIntegrationConfig: this.endUserIntegrationConfig[t3] }, integration: r2, endUserSuppliedValues: e3.endUserSuppliedValues }, d2 = Boolean(r2.needPreOauthInputs && s2 && !(null === (o2 = s2.endUserSuppliedValues) || void 0 === o2 ? void 0 : o2.length) && s2.scheme === a.AuthenticationScheme.OAUTH);
            if (this.isHeadless || d2 || !r2.needPreOauthInputs) {
              l2.authParams = null == s2 ? void 0 : s2.oauthParameters, l2.installOptions = e3;
              const i4 = Math.random().toString(36).substring(2, 15), o3 = (0, u.startOAuthFlow)(l2, i4);
              if (!o3) throw new g.OAuthBlockedError();
              const r3 = () => {
                clearInterval(E2);
              }, a2 = Date.now(), d3 = new AbortController(), c2 = 500;
              let h2 = false;
              const p2 = { abortSignal: d3.signal, onSuccess: (t4) => {
                var e4;
                h2 || (h2 = true, r3(), null === (e4 = n3.onSuccess) || void 0 === e4 || e4.call(n3, t4));
              }, onError: (t4) => {
                var e4;
                h2 || (h2 = true, r3(), d3.abort(), null === (e4 = n3.onError) || void 0 === e4 || e4.call(n3, t4));
              } };
              new Promise(((t4, e4) => {
                const n4 = (i5) => {
                  "oauth_success_callback" === i5.data.type && (window.removeEventListener("message", n4), t4(i5.data.credential.payload.credentialId)), "oauth_error_callback" === i5.data.type && (window.removeEventListener("message", n4), e4(new Error(i5.data.error)));
                };
                window.addEventListener("message", n4);
              })).then(((t4) => {
                p2.onSuccess(t4);
              })).catch(((t4) => {
                p2.onError(t4);
              }));
              const f2 = setInterval((() => {
                try {
                  o3.opener || (clearInterval(f2), this.pollForCredential(t3, i4, p2));
                } catch (e4) {
                  clearInterval(f2), this.pollForCredential(t3, i4, p2);
                }
              }), c2), E2 = setInterval((() => {
                try {
                  if (!h2 && n3.oauthTimeout && Date.now() - a2 > n3.oauthTimeout) return o3.close(), void p2.onError(new g.OAuthTimeoutError());
                } catch (t4) {
                  p2.onError(t4);
                }
              }), c2);
            }
          }
          getIntegrationByName(t3) {
            const e3 = Object.values(this.loadedIntegrations).find(((e4) => (0, l.getIntegrationTypeName)(e4) === t3));
            if (!e3) throw new Error(`Integration "${t3}" not found.`);
            return e3;
          }
          getSelectedMultipleAccountTypes(t3) {
            if (Array.isArray(t3)) return t3;
          }
          getAccountName(t3) {
            return "string" == typeof t3 ? t3.trim() : "";
          }
          setDynamicFieldMappingLoaders(t3, e3) {
            var n3, i3;
            if (this.dynamicFieldMappingLoaders[t3] = {}, e3) {
              for (const [o2, r2] of Object.entries(e3)) if ("object" == typeof r2 && "objectTypes" in r2 && "integrationFields" in r2 && "applicationFields" in r2) {
                const s2 = r2;
                this.dynamicFieldMappingLoaders[t3][o2] = { objectTypes: null === (n3 = s2.objectTypes) || void 0 === n3 ? void 0 : n3.get, integrationFields: null === (i3 = s2.integrationFields) || void 0 === i3 ? void 0 : i3.get }, s2.applicationFields && (e3[o2] = { ...s2.applicationFields, useBYOFieldMappingOption: true });
              }
            }
          }
          async connect(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            const { mapObjectFields: n3, overrideRedirectUrl: i3, isApiInstallation: o2 = false, showPortalAfterInstall: r2, bypassPostOAuthPrompt: s2, allowMultipleCredentials: a2, selectedCredentialId: l2, selectedConfigurationId: d2, accountType: u2, ...h2 } = e3;
            return this.integrationToBeEnabled = t3, new Promise(((f2, E2) => {
              var v2;
              if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
              const I2 = this.getIntegrationByName(t3), _2 = this.getSelectedMultipleAccountTypes(u2);
              this.subscribeToIntegration(t3, { ...h2, onInstall: (e4, n4) => {
                var i4;
                const o3 = n4.integrations[t3];
                e4.credentialId = null == o3 ? void 0 : o3.credentialId, e4.credential = null == o3 ? void 0 : o3.allCredentials.find(((t4) => t4.id === o3.credentialId)), f2(e4), (null == h2 ? void 0 : h2.onInstall) ? h2.onInstall(e4, n4) : null === (i4 = null == h2 ? void 0 : h2.onSuccess) || void 0 === i4 || i4.call(h2, e4, n4);
              }, onError: (t4) => {
                var e4;
                E2(t4), null === (e4 = null == h2 ? void 0 : h2.onError) || void 0 === e4 || e4.call(h2, t4);
              } });
              try {
                if (n3 && !this.project.accessibleFeatures.includes(p.ConnectAddOn.DynamicFieldMapper)) throw new Error("Dynamic Field Mapping is available on our Enterprise plan. Contact sales@useparagon.com to learn more or upgrade.");
                if (this.validateAction(t3), i3 && !(0, S.isValidUrl)(i3)) throw new Error(`${i3} is not valid url.`);
                this.setDynamicFieldMappingLoaders(t3, n3), this.endUserIntegrationConfig[t3] = { mapObjectFields: n3, overrideRedirectUrl: i3 ? (0, S.sanitizeUrl)(i3) : void 0 };
                const h3 = this.getAccountName(u2), g2 = Array.isArray(u2) ? u2.filter(((t4) => {
                  var e4, n4;
                  return !(null === (n4 = null === (e4 = null == I2 ? void 0 : I2.sdkIntegrationConfig) || void 0 === e4 ? void 0 : e4.accountTypes) || void 0 === n4 ? void 0 : n4.some(((e5) => e5.id === t4)));
                })) : [], C2 = (0, c.findSelectedAccountType)(null === (v2 = null == I2 ? void 0 : I2.sdkIntegrationConfig) || void 0 === v2 ? void 0 : v2.accountTypes, h3, _2), O2 = { isApiInstallation: o2, showPortalAfterInstall: r2, bypassPostOAuthPrompt: s2, allowMultipleCredentials: a2, selectedCredentialId: l2, selectedConfigurationId: d2, accountType: u2 };
                if (this.setCredentialConfigForUserState(t3, l2, d2), e3.isApiInstallation) {
                  const n4 = this.isHeadless ? { onSuccess: (t4) => {
                    f2({ integrationId: I2.id, integrationType: I2.type, credentialId: t4 });
                  }, onError: (t4) => {
                    E2(t4);
                  }, oauthTimeout: e3.oauthTimeout } : void 0;
                  this.startOAuthFlow(t3, O2, n4);
                }
                (u2 && !C2 && "string" == typeof u2 || g2.length) && console.warn(`Account type "${g2.length ? g2 : u2}" is not valid for integration "${null == I2 ? void 0 : I2.type}"`);
                const y2 = JSON.parse(JSON.stringify(this.loadedConfigs[t3]));
                if (e3.dropdowns) {
                  const n4 = e3.dropdowns, i4 = [];
                  for (const t4 in n4) {
                    const e4 = n4[t4];
                    if ("loadOptions" in e4) {
                      const n5 = e4.loadOptions;
                      this.customDropdownOptionsLoaders[t4] = n5, i4.push(t4);
                    }
                  }
                  if (y2.sharedMeta && Array.isArray(y2.sharedMeta.inputs)) for (const t4 of y2.sharedMeta.inputs) {
                    if (i4.includes(t4.key)) {
                      t4.customDropdownOptions = [];
                      continue;
                    }
                    const e4 = this.removeOptionDuplicates(n4[t4.key]);
                    e4 && t4.customDropdownOptions && (t4.customDropdownOptions = e4);
                  }
                  if (y2.workflowMeta) for (const t4 in y2.workflowMeta) {
                    const e4 = y2.workflowMeta[t4];
                    for (const t5 of e4.inputs) {
                      if (i4.includes(t5.key)) {
                        t5.customDropdownOptions = [];
                        continue;
                      }
                      const e5 = this.removeOptionDuplicates(n4[t5.key]);
                      e5 && t5.customDropdownOptions && (t5.customDropdownOptions = e5);
                    }
                  }
                  this.loadedConfigs[t3] = y2;
                }
                this.setModalState({ integration: I2, config: this.loadedConfigs[t3], apiInstallationOptions: { ...O2, selectedMultipleAccountTypes: _2, selectedAccountConfig: C2 }, selectedCredentialId: l2, connectionError: void 0, shouldShowPortalAfterInstall: false });
              } catch (e4) {
                this.emitError(e4, t3);
              }
            }));
          }
          setCredentialConfigForUserState(t3, e3, n3) {
            var i3, o2, r2;
            if (!this.userState.authenticated || !(null === (i3 = this.userState.integrations[t3]) || void 0 === i3 ? void 0 : i3.allCredentials.length)) return;
            const a2 = this.userState.integrations[t3], l2 = null !== (o2 = null == a2 ? void 0 : a2.credentialId) && void 0 !== o2 ? o2 : null == a2 ? void 0 : a2.allCredentials[0].id, d2 = this.getCredentialAndConfig(e3 || n3 ? { selectedCredentialId: e3, selectedConfigurationId: n3 } : { selectedCredentialId: l2 }, a2);
            if (!(null === (r2 = null == a2 ? void 0 : a2.allCredentials) || void 0 === r2 ? void 0 : r2.some(((t4) => {
              let { id: e4 } = t4;
              return e4 === (null == d2 ? void 0 : d2.selectedCredential.id);
            }))) || !d2) throw new Error(`Credential with ID "${e3}" is not a valid ${t3} account.`);
            const { selectedConfig: c2, selectedCredential: u2 } = d2, h2 = { ...a2, allConfigurations: (null == a2 ? void 0 : a2.allConfigurations) || [], allCredentials: (null == a2 ? void 0 : a2.allCredentials) || [], enabled: u2.status === s.CredentialStatus.VALID, credentialId: u2.id, credentialStatus: u2.status, providerData: u2.providerData, providerId: u2.providerId, configMeta: null == c2 ? void 0 : c2.configMeta, credentialConfigId: null == c2 ? void 0 : c2.id, externalId: null == c2 ? void 0 : c2.externalId, sharedSettings: null == c2 ? void 0 : c2.sharedSettings, workflowSettings: null == c2 ? void 0 : c2.workflowSettings, configuredWorkflows: null == c2 ? void 0 : c2.workflowSettings };
            this.userState.integrations = { ...this.userState.integrations, [t3]: h2 };
          }
          getCredentialAndConfig(t3, e3) {
            var n3;
            const { selectedCredentialId: i3, selectedConfigurationId: o2 } = t3;
            if (!this.userState.authenticated || !i3 && !o2) return;
            let r2, s2;
            const a2 = null !== (n3 = null == e3 ? void 0 : e3.allCredentials) && void 0 !== n3 ? n3 : Object.values(this.userState.integrations).flatMap(((t4) => (null == t4 ? void 0 : t4.allCredentials) || [])), l2 = a2.flatMap(((t4) => {
              let { configurations: e4 } = t4;
              return e4;
            }));
            if (o2) {
              const t4 = o2.startsWith("ext:") || !(0, v.isUUID)(o2), e4 = (0, f.sanitizeExternalConfigId)(o2);
              if (s2 = l2.find(((n4) => (t4 ? n4.externalId === e4 : n4.id === e4) && (!i3 || n4.connectCredentialId === i3))), !s2) throw new Error(`Credential configuration not found for provided id: ${o2}.`);
            }
            if (r2 = a2.find(((t4) => {
              let { id: e4 } = t4;
              return e4 === ((null == s2 ? void 0 : s2.connectCredentialId) || i3);
            })), s2 = null != s2 ? s2 : null == r2 ? void 0 : r2.configurations.find(((t4) => {
              let { isDefault: e4 } = t4;
              return e4;
            })), !r2) throw new Error("Unable to find credential for provided options.");
            if (!s2) throw new Error(`Credential configuration not found for credential: ${r2.id}.`);
            if (s2 && s2.connectCredentialId !== (null == r2 ? void 0 : r2.id)) throw new Error('Provided "selectedCredentialId" does not belongs to provided "selectedConfigurationId".');
            return { selectedCredential: r2, selectedConfig: s2 };
          }
          _getIntegration(t3) {
            return Object.values(this.loadedIntegrations).find(((e3) => e3.id === t3));
          }
          getIntegrationBySlug(t3) {
            const e3 = this.loadedIntegrations[t3];
            if (!e3) throw new g.IntegrationNotFoundError(t3);
            return e3;
          }
          async _oauthCallback(t3, e3) {
            var n3, i3;
            const { integrationId: o2, payload: r2 } = t3, a2 = this._getIntegration(o2);
            if (!a2) return;
            const d2 = (0, E.hash)(JSON.stringify({ oauthResponse: t3, credentialId: e3 }));
            if (await this.cachedApiResponse.get(d2)) return;
            await this.cachedApiResponse.set(d2, true);
            const c2 = (0, l.getIntegrationTypeName)(a2), u2 = (null === (n3 = this.modalState.apiInstallationOptions) || void 0 === n3 ? void 0 : n3.isApiInstallation) ? this.modalState.apiInstallationOptions : {};
            try {
              const t4 = e3 ? `/sdk/credentials/${e3}/complete-setup` : "/sdk/credentials", n4 = await this.sendConnectRequest(t4, { method: "POST", body: JSON.stringify({ integrationId: a2.id, config: {}, payload: r2, installOptions: u2 }) });
              if (!n4) throw new Error("Unable to save oauth credentials");
              this.updateCredentialData(n4, a2), n4.status === s.CredentialStatus.VALID && this.triggerSDKEvent({ type: p.SDK_EVENT.ON_INTEGRATION_INSTALL, integrationId: a2.id, integrationType: c2 }), this.setModalState({ ...this.modalState, ...(null === (i3 = this.modalState.apiInstallationOptions) || void 0 === i3 ? void 0 : i3.showPortalAfterInstall) ? { shouldShowPortalAfterInstall: true } : {}, connectionError: void 0 });
            } catch (t4) {
              if (this.isHeadless) throw t4;
              this.setModalState({ ...this.modalState, connectionError: t4 }), this.emitError(t4, c2), await this._oauthErrorCallback(t4.message);
            }
          }
          async _oauthErrorCallback(t3, e3) {
            var n3;
            const i3 = t3;
            let o2;
            o2 = this.integrationToBeEnabled ? this.loadedIntegrations[this.integrationToBeEnabled].id : null === (n3 = null == e3 ? void 0 : e3.data) || void 0 === n3 ? void 0 : n3.integrationId, e3 && (this.emitError(e3.data.errorResponse, (0, l.getIntegrationTypeName)(this._getIntegration(o2))), this.setModalState({ ...this.modalState, connectionError: e3.data })), console.error("Failed to connect account to Paragon over OAuth", i3);
          }
          async _loadCustomDropdownOptions(t3, e3, n3) {
            return this.customDropdownOptionsLoaders[t3](e3, n3);
          }
          async sendConnectRequest(t3, e3) {
            let n3 = !(arguments.length > 2 && void 0 !== arguments[2]) || arguments[2];
            var i3;
            if (!this.userState.authenticated || !this.projectId) throw new Error("Connect SDK attempted to make an API request, but no user was authenticated.\nCall paragon.authenticate(<projectId>, <user token>) before using the SDK.");
            const o2 = `${null !== (i3 = null == e3 ? void 0 : e3.baseURLOverride) && void 0 !== i3 ? i3 : this.environments.ZEUS_PUBLIC_URL}${n3 ? `/projects/${this.projectId}` : ""}${t3}`, r2 = (0, E.hash)(JSON.stringify({ url: o2, payload: { ...e3 } })), s2 = await this.cachedApiResponse.get(r2, true);
            if ((null == e3 ? void 0 : e3.cacheResult) && s2) return s2;
            const a2 = Boolean(!e3 || "GET" === e3.method || e3.cacheResult);
            if (a2 && "object" == typeof this.keyToRequestPromiseMap[r2]) return this.keyToRequestPromiseMap[r2];
            const l2 = this.userState.token, d2 = this.modalState.integration && this.integrationToBeEnabled ? this.userState.integrations[this.integrationToBeEnabled] : void 0, c2 = new Promise(((t4, n4) => {
              (async () => {
                try {
                  const n5 = await this.sendRequest(o2, { ...e3, headers: { Accept: "application/json", "Content-Type": "application/json", ...!(null == e3 ? void 0 : e3.skipDefaultCredentialIdHeader) && (null == d2 ? void 0 : d2.credentialId) ? { [p.SELECTED_CREDENTIAL_ID_HEADER]: null == d2 ? void 0 : d2.credentialId } : {}, ...null == e3 ? void 0 : e3.headers, Authorization: `Bearer ${l2}` } }, a2 ? r2 : void 0);
                  t4(n5);
                } catch (t5) {
                  n4(t5);
                }
              })();
            }));
            return a2 && (this.keyToRequestPromiseMap[r2] = c2), c2;
          }
          async sendRequest(t3, e3, n3) {
            var i3;
            let o2, s2, a2;
            try {
              o2 = await fetch(t3, e3);
            } catch (t4) {
              a2 = t4;
            }
            if (o2 && !o2.ok || a2) {
              const e4 = o2 ? await (0, S.getErrorMessage)(o2, true) : null == a2 ? void 0 : a2.message, s3 = "string" == typeof e4 ? e4 : null == e4 ? void 0 : e4.message, l2 = (0, S.errorMessageParser)(s3), d2 = "object" == typeof e4 && e4.response.code === r.INSUFFICIENT_PERMISSION, c2 = "object" == typeof e4 && [r.BYO_CREDENTIAL_VERIFICATION_ERROR, r.BYO_USER_PROFILE_ERROR_CODE].includes(e4.response.code), u2 = 401 === (null == o2 ? void 0 : o2.status) || 403 === (null == o2 ? void 0 : o2.status), h2 = !l2 && !d2 && !c2 && u2;
              if (h2 && !t3.includes("proxy")) this.logout();
              else if (h2 && t3.includes("proxy")) {
                const t4 = await this.fetchUserData();
                this.updateAuthenticatedUser({ integrations: t4.integrations, meta: t4.meta, resources: t4.resources });
              }
              if (n3 && (await this.cachedApiResponse.del(n3), delete this.keyToRequestPromiseMap[n3]), "string" != typeof e4 && t3.includes("proxy")) throw null === (i3 = e4.response) || void 0 === i3 || delete i3.headers, new S.ProxyRequestError(e4.message, e4.response);
              throw new Error("string" == typeof e4 ? s3 : JSON.stringify(e4.response));
            }
            try {
              s2 = await (null == o2 ? void 0 : o2.json());
            } catch {
              s2 = void 0;
            }
            return n3 && (await this.cachedApiResponse.set(n3, s2), delete this.keyToRequestPromiseMap[n3]), s2;
          }
          async request(t3, e3, n3) {
            var i3;
            const o2 = `/sdk/proxy/${t3}`, r2 = e3.startsWith("/") ? e3 : `/${e3}`, s2 = n3.selectedCredentialId ? n3.selectedCredentialId : null === (i3 = this.userState.integrations[t3]) || void 0 === i3 ? void 0 : i3.credentialId, a2 = await this.sendConnectRequest(`${o2}${r2}`, { method: n3.method, body: "object" == typeof n3.body ? JSON.stringify(n3.body) : n3.body, headers: { "Content-Type": p.INFER_CONTENT_TYPE_FROM_CONNECT_OPTIONS, ...s2 ? { [p.SELECTED_CREDENTIAL_ID_HEADER]: s2 } : {}, ...n3.headers }, baseURLOverride: this.environments.WORKER_PROXY_PUBLIC_URL });
            return null == a2 ? void 0 : a2.output;
          }
          async event(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
            const { selectedConfigurationId: i3, selectedCredentialId: o2 } = n3;
            if (i3 && !o2) throw new Error("Configuration ID cannot be used without a corresponding Credential ID. Please provide both if using Configuration ID.");
            await this.sendConnectRequest(`/v2/projects/${this.projectId}/sdk/events/trigger`, { method: "POST", headers: { ...o2 ? { [p.SELECTED_CREDENTIAL_ID_HEADER]: o2 } : {}, ...i3 ? { [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: i3 } : {} }, body: JSON.stringify({ name: t3, payload: e3 }), skipDefaultCredentialIdHeader: true }, false);
          }
          onClose() {
            let t3 = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
            const { integration: n3, apiInstallationOptions: i3 } = this.modalState;
            n3 && (this.triggerSDKEvent({ type: p.SDK_EVENT.ON_PORTAL_CLOSE, integrationId: n3.id, integrationType: (0, l.getIntegrationTypeName)(n3) }), this.originalBodyOverflow !== e2.PARAGON_OVERFLOW_EMPTY_VALUE && (window.document.body.style.overflow = this.originalBodyOverflow, this.originalBodyOverflow = e2.PARAGON_OVERFLOW_EMPTY_VALUE), !t3 && (null == i3 ? void 0 : i3.isApiInstallation) || (this.setModalState({ integration: null }), this.integrationToBeEnabled = void 0));
          }
          onOpen() {
            const { integration: t3 } = this.modalState;
            if (t3 && (this.triggerSDKEvent({ type: p.SDK_EVENT.ON_PORTAL_OPEN, integrationId: t3.id, integrationType: (0, l.getIntegrationTypeName)(t3) }), this.root && this.originalBodyOverflow === e2.PARAGON_OVERFLOW_EMPTY_VALUE)) {
              const t4 = this.root.getBoundingClientRect();
              window.innerHeight <= t4.height && window.innerWidth <= t4.width && (this.originalBodyOverflow = window.document.body.style.overflow, window.document.body.style.overflow = "hidden");
            }
          }
          triggerSDKEvent(t3) {
            this.triggerEvent(t3, this.userState);
          }
          getIntegrationMetadata(t3) {
            const e3 = (t4) => {
              return { ...t4, icon: (e4 = t4.icon, e4.includes(".svg") ? (null === (n3 = e4.split(".svg")) || void 0 === n3 ? void 0 : n3[0]) + ".svg" : e4) };
              var e4, n3;
            };
            if (t3) {
              const n3 = this.metadata[t3];
              if (!n3) throw new Error(`${t3} is not a valid integration name`);
              return e3(n3);
            }
            return Object.values(this.metadata).map(e3);
          }
          closePortal() {
            this.onClose(true);
          }
          workflow(t3) {
            let { selectedCredentialId: e3, selectedConfigurationId: n3, body: i3 = {}, query: o2 = {}, headers: r2 = {} } = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            var s2;
            if (!t3) throw new Error("workflowId is required.");
            const a2 = new URLSearchParams(o2).toString(), { integrationState: l2 } = this.getIntegrationForWorkflow(t3), d2 = this.getCredentialAndConfig(e3 || n3 ? { selectedCredentialId: e3, selectedConfigurationId: n3 } : { selectedCredentialId: l2.credentialId }, l2);
            if (!d2 || !(null === (s2 = d2.selectedConfig.workflowSettings[t3]) || void 0 === s2 ? void 0 : s2.enabled)) throw new Error(`Workflow ${t3} is not enabled for this user.`);
            return this.sendConnectRequest(`/sdk/triggers/${t3}?${a2}`, { method: "POST", body: JSON.stringify(i3), headers: { [p.SELECTED_CREDENTIAL_ID_HEADER]: d2.selectedCredential.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: d2.selectedConfig.id, ...r2 } }, true);
          }
          installIntegration(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            this.closePortal();
            const n3 = { showPortalAfterInstall: false, bypassPostOAuthPrompt: false, allowMultipleCredentials: false, ...e3, isApiInstallation: true };
            if (n3.bypassPostOAuthPrompt && n3.showPortalAfterInstall) throw new Error("Could not use both `bypassPostOAuthPrompt` and `showPortalAfterInstall` as true at the same time.");
            if (this.ensureHeadlessIsSupported(), this.validateAction(t3), !n3.allowMultipleCredentials && this.isAlreadyInstalled(t3, this.userState)) throw new Error(`Integration "${t3}" is already installed.`);
            if (e3.showPortalAfterInstall) {
              const e4 = Object.values(this.loadedIntegrations).find(((e5) => (0, l.getIntegrationTypeName)(e5) === t3));
              this.setModalState({ integration: e4, config: this.loadedConfigs[t3], apiInstallationOptions: n3, shouldShowPortalAfterInstall: false });
            } else this.setModalState({ integration: null });
            return this.connect(t3, n3);
          }
          ensureHeadlessIsSupported() {
            if (!this.project.accessibleFeatures.includes(p.ConnectAddOn.HeadlessConnectPortal)) throw new Error("Headless Connect Portal is available on our Pro plan and above. Contact sales@useparagon.com to learn more or upgrade.");
          }
          async uninstallIntegration(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            const n3 = null == e3 ? void 0 : e3.selectedCredentialId;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            if (this.ensureHeadlessIsSupported(), this.validateAction(t3), !this.isAlreadyInstalled(t3, this.userState, e3.selectedCredentialId)) throw new g.IntegrationNotInstalledError(t3);
            const i3 = this.loadedIntegrations[t3].id, o2 = this.userState.integrations[t3], r2 = n3 || (null == o2 ? void 0 : o2.credentialId);
            if (!r2 || !o2) throw new Error("No credential found for uninstall");
            await this.sendConnectRequest(`/sdk/integrations/${i3}`, { method: "DELETE", headers: { ...r2 ? { [p.SELECTED_CREDENTIAL_ID_HEADER]: r2 } : {} } }), this.updateAuthenticatedUser({ integrations: { ...this.userState.integrations, [t3]: (0, c.getActionStateForCredentialDelete)(r2, o2) } }), n3 === this.modalState.selectedCredentialId && this.setModalState({ integration: null, selectedCredentialId: void 0 }), this.saveState(), this.triggerSDKEvent({ type: p.SDK_EVENT.ON_INTEGRATION_UNINSTALL, integrationId: i3, integrationType: t3 });
          }
          async disableWorkflow(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            var n3;
            const { selectedCredentialId: i3, selectedConfigurationId: o2 } = e3, { integration: r2, integrationState: s2 } = this.getIntegrationForWorkflow(t3), a2 = this.getCredentialAndConfig(i3 || o2 ? { selectedCredentialId: i3, selectedConfigurationId: o2 } : { selectedCredentialId: s2.credentialId }, s2);
            if (!a2 || !(null === (n3 = a2.selectedConfig.workflowSettings[t3]) || void 0 === n3 ? void 0 : n3.enabled)) throw new Error(`Workflow ${t3} cannot be disabled for this user.`);
            const { selectedConfig: l2, selectedCredential: d2 } = a2;
            await this.sendConnectRequest(`/sdk/workflows/${t3}`, { method: "DELETE", headers: { [p.SELECTED_CREDENTIAL_ID_HEADER]: d2.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: l2.id } });
            const c2 = { ...l2, workflowSettings: { ...l2.workflowSettings, [t3]: { settings: {}, ...l2.workflowSettings[t3], enabled: false } } }, u2 = { ...d2, configurations: d2.configurations.filter(((t4) => t4.id !== l2.id)).concat(c2) };
            this.updateCredentialData(u2, r2);
          }
          async enableWorkflow(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            var n3;
            const { selectedCredentialId: i3, selectedConfigurationId: o2 } = e3, { integration: r2, integrationState: a2 } = this.getIntegrationForWorkflow(t3), l2 = this.getCredentialAndConfig(i3 || o2 ? { selectedCredentialId: i3, selectedConfigurationId: o2 } : { selectedCredentialId: a2.credentialId }, a2);
            if (!l2 || (null == l2 ? void 0 : l2.selectedCredential.status) !== s.CredentialStatus.VALID) throw new Error("Valid credential not found for provided options.");
            const { selectedConfig: d2, selectedCredential: c2 } = l2;
            if (null === (n3 = d2.workflowSettings[t3]) || void 0 === n3 ? void 0 : n3.enabled) throw new Error(`Workflow ${t3} is already enabled for this user.`);
            await this.sendConnectRequest(`/sdk/workflows/${t3}`, { method: "POST", headers: { [p.SELECTED_CREDENTIAL_ID_HEADER]: c2.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: d2.id } });
            const u2 = { ...d2, workflowSettings: { ...d2.workflowSettings, [t3]: { settings: {}, ...d2.workflowSettings[t3], enabled: true } } }, h2 = { ...c2, configurations: c2.configurations.filter(((t4) => t4.id !== d2.id)).concat(u2) };
            this.updateCredentialData(h2, r2);
          }
          async getIntegrationAccount(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            var n3;
            this.validateAction(t3);
            const i3 = null === (n3 = this.userState.integrations[t3]) || void 0 === n3 ? void 0 : n3.allCredentials;
            if (!(null == i3 ? void 0 : i3.length)) throw new Error("Connect credential not found");
            const o2 = await this.sendConnectRequest(`/sdk/credentials?integration=${t3}&includeAccountAuth=${e3.includeAccountAuth}`, { method: "GET", headers: e3.selectedCredentialId ? { [p.SELECTED_CREDENTIAL_ID_HEADER]: e3.selectedCredentialId } : {} });
            if (!o2) throw new Error("Integration not connected");
            return o2;
          }
          getIntegrationForWorkflow(t3) {
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            const e3 = Object.values(this.loadedIntegrations).find(((e4) => {
              const n4 = e4.configs[0].values;
              return t3 in (n4.workflowMeta || {});
            }));
            if (!e3) throw new Error("Workflow not found in the configured integrations in your Paragon project.");
            const n3 = (0, l.getIntegrationTypeName)(e3) ? this.userState.integrations[(0, l.getIntegrationTypeName)(e3)] : void 0;
            if (!n3 || !n3.allCredentials.some(((t4) => {
              let { status: e4 } = t4;
              return e4 === s.CredentialStatus.VALID;
            }))) throw new Error(`Integration "${(0, l.getIntegrationTypeName)(e3)}" not enabled for workflow."`);
            return { integration: e3, integrationState: n3 };
          }
          async updateLocalState(t3) {
            var e3, n3;
            const [i3, o2] = await Promise.all([this.fetchUserData(t3), this.fetchIntegrations()]);
            this.project = i3.project;
            let r2 = { ...i3.integrations };
            if (this.modalState.integration && this.integrationToBeEnabled) {
              const t4 = this.userState.integrations[this.integrationToBeEnabled], i4 = null == t4 ? void 0 : t4.credentialConfigId, o3 = null == t4 ? void 0 : t4.credentialId;
              let s2;
              if (i4) s2 = null === (e3 = r2[this.integrationToBeEnabled]) || void 0 === e3 ? void 0 : e3.allConfigurations.find(((t5) => {
                let { id: e4 } = t5;
                return e4 === i4;
              }));
              else if (o3) {
                const t5 = null === (n3 = r2[this.integrationToBeEnabled]) || void 0 === n3 ? void 0 : n3.allCredentials.find(((t6) => {
                  let { id: e4 } = t6;
                  return e4 === o3;
                }));
                s2 = t5 ? t5.configurations.find(((t6) => t6.isDefault)) : void 0;
              }
              s2 && (r2 = { ...r2, [this.integrationToBeEnabled]: { enabled: false, allConfigurations: [], allCredentials: [], ...r2[this.integrationToBeEnabled], credentialId: s2.connectCredentialId, credentialConfigId: s2.id, workflowSettings: s2.workflowSettings, configuredWorkflows: s2.workflowSettings, sharedSettings: s2.sharedSettings, configMeta: s2.configMeta } });
            }
            this.updateAuthenticatedUser({ integrations: r2, meta: i3.meta, resources: i3.resources }), this.updateIntegrations(o2), this.saveState();
          }
          async fetchUserData(t3) {
            const e3 = await this.sendConnectRequest("/sdk/me", { headers: (0, f.getHeadersForUserMeta)(t3) });
            if (!e3) throw new Error("Unable to get user Data");
            return { ...e3, integrations: Object.fromEntries(Object.entries(e3.integrations).map(((t4) => {
              let [e4, n3] = t4;
              const i3 = n3.allCredentials.flatMap(((t5) => {
                let { configurations: e5 } = t5;
                return e5;
              }));
              return [e4, { ...n3, allConfigurations: i3 }];
            }))) };
          }
          async fetchIntegrations() {
            const t3 = await this.sendConnectRequest("/sdk/integrations");
            if (!t3) throw new Error("Unable to fetch integrations");
            return t3;
          }
          getIntegrationIcon(t3) {
            if (!t3.customIntegration) {
              const e3 = p.overrideActionAlias[t3.type] || t3.type;
              return `${this.environments.CDN_PUBLIC_URL}/integrations/${e3}.svg`;
            }
            return t3.customIntegration.icon ? t3.customIntegration.icon : `${this.environments.CDN_PUBLIC_URL}/images/icons/byo-placeholder.svg`;
          }
          updateIntegrations(t3) {
            t3.forEach(((t4) => {
              var e3;
              if (t4.configs.length) try {
                const n3 = (0, l.getIntegrationTypeName)(t4);
                this.loadedConfigs[n3] = t4.configs[0].values, this.loadedIntegrations[n3] = { ...t4, type: t4.type.startsWith("custom.") ? r.ACTION_CUSTOM : t4.type }, Boolean(t4.isActive) && (this.metadata[n3] = { type: n3, name: t4.name, brandColor: t4.brandColor, icon: this.getIntegrationIcon(t4) }), (null === (e3 = this.modalState.integration) || void 0 === e3 ? void 0 : e3.id) === t4.id && this.setModalState({ integration: { ...t4, type: t4.type.startsWith("custom.") ? r.ACTION_CUSTOM : t4.type } });
              } catch (t5) {
                console.warn(t5);
              }
            }));
          }
          async setUserMetadata(t3) {
            return await this.sendConnectRequest("/sdk/me", { method: "PATCH", body: JSON.stringify({ meta: t3 }) }), await this.updateLocalState(), this.render(), this.userState;
          }
          configureGlobal(t3, e3) {
            var n3, i3, o2, r2, s2, a2, l2, d2;
            if (!t3 || !t3.host) throw new Error("host not specified");
            const c2 = t3.host.indexOf("http") > -1 ? new URL(t3.host).hostname : t3.host;
            this.environments.CONNECT_PUBLIC_URL = null !== (n3 = null == e3 ? void 0 : e3.CONNECT_PUBLIC_URL) && void 0 !== n3 ? n3 : (0, S.getServiceUrl)("connect", c2), this.environments.DASHBOARD_PUBLIC_URL = null !== (i3 = null == e3 ? void 0 : e3.DASHBOARD_PUBLIC_URL) && void 0 !== i3 ? i3 : (0, S.getServiceUrl)("dashboard", c2), this.environments.HERMES_PUBLIC_URL = null !== (o2 = null == e3 ? void 0 : e3.HERMES_PUBLIC_URL) && void 0 !== o2 ? o2 : (0, S.getServiceUrl)("hermes", c2), this.environments.PASSPORT_PRODUCTION_URL = null !== (r2 = null == e3 ? void 0 : e3.PASSPORT_PRODUCTION_URL) && void 0 !== r2 ? r2 : (0, S.getServiceUrl)("passport", c2), this.environments.PASSPORT_PUBLIC_URL = null !== (s2 = null == e3 ? void 0 : e3.PASSPORT_PUBLIC_URL) && void 0 !== s2 ? s2 : (0, S.getServiceUrl)("passport", c2), this.environments.ZEUS_PUBLIC_URL = null !== (a2 = null == e3 ? void 0 : e3.ZEUS_PUBLIC_URL) && void 0 !== a2 ? a2 : (0, S.getServiceUrl)("zeus", c2), this.environments.CDN_PUBLIC_URL = null !== (l2 = null == e3 ? void 0 : e3.CDN_PUBLIC_URL) && void 0 !== l2 ? l2 : (0, S.getServiceUrl)("dashboard", c2), this.environments.WORKER_PROXY_PUBLIC_URL = null !== (d2 = null == e3 ? void 0 : e3.WORKER_PROXY_PUBLIC_URL) && void 0 !== d2 ? d2 : (0, S.getServiceUrl)("proxy", c2), this.userState.authenticated = false, this.root ? this.root.src = `${this.environments.CONNECT_PUBLIC_URL}/ui${this.projectId ? `?projectId=${this.projectId}` : ""}` : console.error("Root element not defined");
          }
          async completeInstall(t3, e3) {
            var n3;
            if (!this.userState.authenticated) throw new Error("Authentication is required");
            if (!e3 || !e3.authorizationCode) throw new Error("authorizationCode is required");
            if (e3.redirectUrl && !(0, S.isValidUrl)(e3.redirectUrl)) throw new Error(`${e3.redirectUrl} is not valid url`);
            this.validateAction(t3);
            const i3 = Object.values(this.loadedIntegrations).find(((e4) => (0, l.getIntegrationTypeName)(e4) === t3)), o2 = null === (n3 = e3.showPortalAfterInstall) || void 0 === n3 || n3, r2 = await this.sendConnectRequest("/sdk/credentials", { method: "POST", body: JSON.stringify({ code: e3.authorizationCode, integrationId: i3.id, redirectUrl: e3.redirectUrl ? (0, S.sanitizeUrl)(e3.redirectUrl) : void 0, integrationOptions: e3.integrationOptions || {} }) });
            if (!r2) throw new Error("Unable to create credential");
            this.updateCredentialData(r2, i3), o2 && this.setModalState({ integration: i3, config: this.loadedConfigs[t3], apiInstallationOptions: {} });
          }
          updateCredentialData(t3, e3) {
            var n3;
            const i3 = this.userState, o2 = (0, l.getIntegrationTypeName)(e3), r2 = i3.integrations[o2], a2 = r2.allCredentials.findIndex(((e4) => {
              let { id: n4 } = e4;
              return n4 === t3.id;
            }));
            a2 > -1 ? r2.allCredentials[a2] = t3 : r2.allCredentials.push(t3);
            const d2 = Object.values(null !== (n3 = r2.allConfigurations) && void 0 !== n3 ? n3 : []).filter(((e4) => {
              let { connectCredentialId: n4 } = e4;
              return n4 !== t3.id;
            })).concat(t3.configurations);
            if (!(-1 === a2 || t3.id === r2.credentialId || !(!r2.credentialConfigId || !t3.configurations.some(((t4) => t4.id === r2.credentialConfigId))))) return this.updateAuthenticatedUser({ integrations: { ...i3.integrations, [o2]: { ...r2, allConfigurations: d2 } } }), void this.saveState();
            const c2 = r2.credentialConfigId ? t3.configurations.find(((t4) => r2.credentialConfigId === t4.id)) : t3.configurations[0];
            this.updateAuthenticatedUser({ integrations: { ...i3.integrations, [o2]: { ...r2, allConfigurations: d2, credentialStatus: t3.status, enabled: t3.status === s.CredentialStatus.VALID, credentialId: t3.id, providerId: t3.providerId, providerData: t3.providerData, configMeta: null == c2 ? void 0 : c2.configMeta, credentialConfigId: null == c2 ? void 0 : c2.id, externalId: null == c2 ? void 0 : c2.externalId, sharedSettings: null == c2 ? void 0 : c2.sharedSettings, workflowSettings: null == c2 ? void 0 : c2.workflowSettings, configuredWorkflows: null == c2 ? void 0 : c2.workflowSettings } } }), this.saveState();
          }
          async connectAction(t3, e3) {
            var n3;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            const i3 = null === (n3 = this.userState.resources.find(((e4) => t3 === e4.slug))) || void 0 === n3 ? void 0 : n3.id;
            if (!i3) throw new Error(`No resource found with name "${t3}".`);
            if (!e3 || "object" != typeof e3) throw new Error("payload must be of type object.");
            const o2 = await this.sendConnectRequest(`/sdk/resources/${i3}/connect`, { method: "POST", body: JSON.stringify(e3) });
            if (!o2) throw new Error(`Unable to connect to "${t3}".`);
            return o2;
          }
          async createConfiguration(t3) {
            let { credentialId: e3, externalId: n3 } = t3;
            var i3, o2;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            if (!e3) throw new Error('Required options not provided: "credentialId"');
            const r2 = this.getCredentialAndConfig({ selectedCredentialId: e3 });
            if (!r2 || (null == r2 ? void 0 : r2.selectedCredential.status) !== s.CredentialStatus.VALID) throw new Error("Valid credential not found for provided options.");
            const a2 = await this.sendConnectRequest(`/sdk/credentials/${e3}/configurations`, { method: "POST", body: JSON.stringify(n3 ? { externalId: n3 } : {}) });
            if (!a2) throw new Error("Unable to create a configuration for credential.");
            const l2 = Object.keys(this.userState.integrations).find(((t4) => {
              var e4;
              return null === (e4 = this.userState.integrations[t4]) || void 0 === e4 ? void 0 : e4.allCredentials.find(((t5) => {
                let { id: e5 } = t5;
                return e5 === a2.id;
              }));
            }));
            if (l2) {
              const t4 = null === (i3 = this.userState.integrations[l2]) || void 0 === i3 ? void 0 : i3.allConfigurations.filter(((t5) => {
                let { connectCredentialId: e5 } = t5;
                return e5 !== a2.id;
              })).concat(a2.configurations), e4 = null === (o2 = this.userState.integrations[l2]) || void 0 === o2 ? void 0 : o2.allCredentials.map(((t5) => t5.id === a2.id ? a2 : t5)), n4 = { ...this.userState.integrations, [l2]: { enabled: false, ...this.userState.integrations[l2], allConfigurations: t4 || [], allCredentials: e4 || [] } };
              this.updateAuthenticatedUser({ integrations: n4 });
            }
            return a2.configurations.sort(((t4, e4) => new Date(e4.dateCreated).getTime() - new Date(t4.dateCreated).getTime()))[0];
          }
          async destroyConfiguration(t3) {
            let { id: e3, credentialId: n3 } = t3;
            var i3, o2, r2, s2;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            if (!(null == e3 ? void 0 : e3.trim()) || !(null == n3 ? void 0 : n3.trim())) throw new Error("One or more required options not provided.");
            const a2 = this.getCredentialAndConfig({ selectedConfigurationId: e3, selectedCredentialId: n3 });
            if (!a2) throw new Error(`Unable to find credential for configuration: ${e3}.`);
            if (a2.selectedConfig.isDefault) throw new Error("Cannot delete default configuration.");
            await this.sendConnectRequest(`/sdk/credentials/${a2.selectedCredential.id}/configurations`, { method: "DELETE", headers: { [p.SELECTED_CREDENTIAL_ID_HEADER]: null == a2 ? void 0 : a2.selectedCredential.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: null == a2 ? void 0 : a2.selectedConfig.id } });
            const l2 = Object.keys(this.userState.integrations).find(((t4) => {
              var e4;
              return null === (e4 = this.userState.integrations[t4]) || void 0 === e4 ? void 0 : e4.allCredentials.find(((t5) => {
                let { id: e5 } = t5;
                return e5 === a2.selectedCredential.id;
              }));
            }));
            if (l2) {
              const { selectedConfig: t4, selectedCredential: e4 } = a2, n4 = null === (i3 = this.userState.integrations[l2]) || void 0 === i3 ? void 0 : i3.allConfigurations.filter(((e5) => {
                let { id: n5 } = e5;
                return n5 !== t4.id;
              })), d2 = null === (o2 = this.userState.integrations[l2]) || void 0 === o2 ? void 0 : o2.allCredentials.map(((n5) => n5.id !== e4.id ? n5 : { ...n5, configurations: n5.configurations.filter(((e5) => {
                let { id: n6 } = e5;
                return n6 !== t4.id;
              })) })), c2 = { ...this.userState.integrations, [l2]: { enabled: false, ...this.userState.integrations[l2], allConfigurations: n4 || [], allCredentials: d2 || [] } };
              this.updateAuthenticatedUser({ integrations: c2 }), (null === (r2 = this.userState.integrations[l2]) || void 0 === r2 ? void 0 : r2.credentialId) === e4.id && (null === (s2 = this.userState.integrations[l2]) || void 0 === s2 ? void 0 : s2.credentialConfigId) === t4.id && this.closePortal();
            }
          }
          async updateConfiguration(t3) {
            let { id: e3, credentialId: n3, meta: i3 = {} } = t3;
            var o2, r2;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            if (!(null == e3 ? void 0 : e3.trim()) || !(null == n3 ? void 0 : n3.trim())) throw new Error("One or more required options not provided.");
            const s2 = this.getCredentialAndConfig({ selectedConfigurationId: e3, selectedCredentialId: n3 });
            if (!(null == s2 ? void 0 : s2.selectedConfig)) throw new Error(`Cannot find credential configuration with given id: "${e3}"`);
            const a2 = await this.sendConnectRequest(`/sdk/credentials/${s2.selectedConfig.connectCredentialId}/configurations`, { method: "PATCH", body: JSON.stringify({ meta: i3 }), headers: { [p.SELECTED_CREDENTIAL_ID_HEADER]: s2.selectedCredential.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: s2.selectedConfig.id } });
            if (!a2) throw new Error("Unable to update configuration.");
            const l2 = Object.keys(this.userState.integrations).find(((t4) => {
              var e4;
              return null === (e4 = this.userState.integrations[t4]) || void 0 === e4 ? void 0 : e4.allCredentials.find(((t5) => {
                let { id: e5 } = t5;
                return e5 === a2.id;
              }));
            }));
            if (l2) {
              const t4 = null === (o2 = this.userState.integrations[l2]) || void 0 === o2 ? void 0 : o2.allConfigurations.filter(((t5) => {
                let { connectCredentialId: e5 } = t5;
                return e5 !== a2.id;
              })).concat(a2.configurations), e4 = null === (r2 = this.userState.integrations[l2]) || void 0 === r2 ? void 0 : r2.allCredentials.map(((t5) => t5.id === a2.id ? a2 : t5)), n4 = { ...this.userState.integrations, [l2]: { enabled: false, ...this.userState.integrations[l2], allConfigurations: t4 || [], allCredentials: e4 || [] } };
              this.updateAuthenticatedUser({ integrations: n4 });
            }
            const d2 = a2.configurations.find(((t4) => {
              let { id: e4 } = t4;
              return e4 === s2.selectedConfig.id;
            }));
            return d2;
          }
          async pollForCredential(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
            var i3;
            const o2 = Date.now(), r2 = async () => {
              try {
                return await this.sendConnectRequest(`/sdk/actions/session-id/${e3}`, { method: "GET" });
              } catch (t4) {
                return console.error("error", t4), null;
              }
            };
            try {
              const e4 = await (0, v.tryUntil)(r2, ((t4, e5) => {
                var i4;
                return !(null === (i4 = n3.abortSignal) || void 0 === i4 ? void 0 : i4.aborted) && !(Date.now() - o2 >= u.MAX_POLL_DURATION || (null == t4 ? void 0 : t4.connectCredentialId));
              }), 1e3);
              if (!e4 || !e4.connectCredentialId) return;
              n3.onSuccess && n3.onSuccess(e4.connectCredentialId);
              if (null === (i3 = this.userState.integrations[t3]) || void 0 === i3 ? void 0 : i3.allCredentials.find(((t4) => t4.id === e4.connectCredentialId))) return;
              const s2 = await this.sendConnectRequest(`/sdk/credentials/${e4.connectCredentialId}`, { method: "GET" });
              if (!s2) return;
              this.updateCredentialData(s2, this.loadedIntegrations[t3]);
            } catch (t4) {
              n3.onError && n3.onError(t4);
            } finally {
              await this.sendConnectRequest(`/sdk/actions/session-id/${e3}`, { method: "DELETE" });
            }
          }
          getIntegrationConfig(t3) {
            var e3, n3;
            if (!t3) throw new Error("Integration is required.");
            const i3 = this.loadedIntegrations[t3], o2 = i3.configs[0].values, r2 = [], s2 = [], a2 = new Map(i3.workflows.map(((t4) => [t4.id, t4]))), l2 = null !== (e3 = i3.noPermissionWorkflows) && void 0 !== e3 ? e3 : [];
            return Object.values(o2.workflowMeta || {}).map(((t4) => {
              var e4;
              if (!a2.has(t4.id) && !l2.includes(t4.id)) return;
              const n4 = null === (e4 = a2.get(t4.id)) || void 0 === e4 ? void 0 : e4.description;
              t4.hidden || t4.permissions && l2.includes(t4.id) ? r2.push({ ...t4, description: n4 }) : s2.push({ ...t4, description: n4 });
            })), { shortDescription: o2.description, longDescription: o2.overview, availableUserSettings: null === (n3 = o2.sharedMeta) || void 0 === n3 ? void 0 : n3.inputs, availableWorkflows: s2, hiddenWorkflows: r2 };
          }
          getIntegrationCredential(t3) {
            let { integration: e3, settings: n3 } = t3;
            const { selectedCredentialId: i3, selectedConfigurationId: o2 } = n3, r2 = this.userState.integrations[e3];
            if (!r2) throw new Error(`Integration "${e3}" state not found.`);
            const a2 = this.getCredentialAndConfig(i3 || o2 ? { selectedCredentialId: i3, selectedConfigurationId: o2 } : { selectedCredentialId: r2.credentialId }, r2);
            if (!a2 || (null == a2 ? void 0 : a2.selectedCredential.status) !== s.CredentialStatus.VALID) throw new Error("Valid credential not found for provided options.");
            return a2;
          }
          async updateIntegrationUserSettings(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
            var i3;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            this.validateAction(t3);
            const { selectedConfig: o2, selectedCredential: r2 } = this.getIntegrationCredential({ integration: t3, settings: n3 }), s2 = this.userState.token, a2 = null === (i3 = this.userState.integrations[t3]) || void 0 === i3 ? void 0 : i3.sharedSettings, l2 = await this.sendConnectRequest(`/sdk/credentials/${r2.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${s2}`, [p.SELECTED_CREDENTIAL_ID_HEADER]: r2.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: o2.id }, body: JSON.stringify({ config: { sharedSettings: { ...a2, ...e3 } } }) });
            if (!l2) throw new Error(`Failed to update settings for ${t3}.`);
            if (l2.credential) {
              const e4 = this.loadedIntegrations[t3];
              this.updateCredentialData(l2.credential, e4);
            }
            return { userState: this.userState, errors: l2.errors || [] };
          }
          async updateWorkflowUserSettings(t3, e3, n3) {
            let i3 = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};
            var o2;
            if (!this.userState.authenticated) throw new g.UserNotAuthenticatedError();
            this.validateAction(t3);
            const { selectedConfig: r2, selectedCredential: s2 } = this.getIntegrationCredential({ integration: t3, settings: i3 }), a2 = this.userState.token, l2 = structuredClone(null === (o2 = this.userState.integrations[t3]) || void 0 === o2 ? void 0 : o2.workflowSettings), d2 = null == l2 ? void 0 : l2[e3];
            if (!d2) throw new Error("The workflow needs to be enabled in order to add workflow level user settings.");
            for (const t4 in n3) d2.settings[t4] = n3[t4];
            const c2 = await this.sendConnectRequest(`/sdk/credentials/${s2.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${a2}`, [p.SELECTED_CREDENTIAL_ID_HEADER]: s2.id, [p.SELECTED_CREDENTIAL_CONFIG_ID_HEADER]: r2.id }, body: JSON.stringify({ config: { workflowSettings: l2 } }) });
            if (!c2) throw new Error(`Failed to update settings for ${t3}.`);
            if (c2.credential) {
              const e4 = this.loadedIntegrations[t3];
              this.updateCredentialData(c2.credential, e4);
            }
            return { userState: this.userState, errors: c2.errors || [] };
          }
          async updateWorkflowState(t3, e3) {
            const n3 = [];
            for (const [i3, o2] of Object.entries(t3)) try {
              o2 ? await this.enableWorkflow(i3, e3) : await this.disableWorkflow(i3, e3);
            } catch (t4) {
              n3.push({ workflowId: i3, message: t4.message });
            }
            return { user: this.getUser(), errors: n3 };
          }
          async getFieldOptions(t3) {
            let { integration: e3, action: n3, search: i3, cursor: o2, parameters: r2 = [] } = t3;
            this.validateAction(e3);
            const s2 = await this.sendConnectRequest("/sdk/actions", { method: "POST", body: JSON.stringify({ action: e3, sourceKey: n3, parameters: r2, paginationParameters: { pageCursor: null != o2 ? o2 : 0, search: i3 } }) });
            let a2 = [], l2 = [];
            const d2 = s2.output.records || s2.output;
            return d2[0] && "id" in d2[0] ? l2 = d2 : a2 = d2, { data: a2, nestedData: l2, nextPageCursor: s2.output.nextPageCursor || null };
          }
          async getDataSourceOptions(t3, e3) {
            var n3;
            return null === (n3 = this.getIntegrationByName(t3).sdkIntegrationConfig) || void 0 === n3 ? void 0 : n3.dataSources[e3];
          }
          getAccountTypeOptions(t3) {
            var e3, n3;
            return null !== (n3 = null === (e3 = this.getIntegrationBySlug(t3).sdkIntegrationConfig) || void 0 === e3 ? void 0 : e3.accountTypes) && void 0 !== n3 ? n3 : [];
          }
          getPreOptions(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "default";
            var n3, i3, o2, r2;
            const s2 = this.getIntegrationBySlug(t3);
            if (s2.customIntegration) return s2.authenticationType === a.AuthenticationScheme.OAUTH_CLIENT_CREDENTIAL ? w : null !== (n3 = s2.customIntegration.inputFields) && void 0 !== n3 ? n3 : [];
            const l2 = this.getAccountTypeOptions(t3);
            if (null == l2 ? void 0 : l2.length) {
              const t4 = null == l2 ? void 0 : l2.find(((t5) => t5.id === e3));
              if ("basic" === (null == t4 ? void 0 : t4.scheme)) return null !== (i3 = t4.endUserSuppliedValues) && void 0 !== i3 ? i3 : [];
            }
            return (null === (r2 = null === (o2 = s2.sdkIntegrationConfig) || void 0 === o2 ? void 0 : o2.authConfigInputs) || void 0 === r2 ? void 0 : r2.length) ? s2.sdkIntegrationConfig.authConfigInputs : [];
          }
          getPostOptions(t3) {
            var e3, n3;
            return null !== (n3 = null === (e3 = this.getIntegrationBySlug(t3).sdkIntegrationConfig) || void 0 === e3 ? void 0 : e3.postOauthInputs) && void 0 !== n3 ? n3 : [];
          }
          async _fetchBYOFieldMappingOptions(t3, e3, n3, i3) {
            var o2;
            const r2 = null === (o2 = this.dynamicFieldMappingLoaders[t3]) || void 0 === o2 ? void 0 : o2[n3];
            if (!r2) throw new Error(`No dynamic field mapping loader found for key: ${n3}`);
            if (e3 === p.DynamicFieldMappingLoaderType.OBJECT_TYPES) return await r2.objectTypes(null == i3 ? void 0 : i3.cursor, null == i3 ? void 0 : i3.search);
            if (e3 === p.DynamicFieldMappingLoaderType.INTEGRATION_FIELDS) {
              if (!(null == i3 ? void 0 : i3.objectType)) throw new Error("objectType is required for integrationFields");
              return await r2.integrationFields({ objectType: i3.objectType }, i3.cursor, i3.search);
            }
            throw new Error(`Invalid type: ${e3}. Must be 'objectTypes' or 'integrationFields'`);
          }
        }
        e2.default = y;
        class m {
          constructor(t3) {
            this.paragon = t3, this.startOptions = null, this.integrationName = null, this.accountType = null, this.preOptions = null, this.postOptions = null, this.credentialId = null;
          }
          start(t3) {
            let e3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            this.asyncStart(t3, e3).catch(((t4) => {
              this.handleError(t4);
            }));
          }
          async asyncStart(t3, e3) {
            if (this.startOptions = e3, this.integrationName = t3, this.accountType = null, this.preOptions = null, this.postOptions = null, this.credentialId = null, !this.paragon.isHeadless) throw new g.HeadlessModeNotEnabledError();
            const n3 = this.next();
            if ("done" === n3.stage || "postOptions" === n3.stage) {
              const i3 = await this.paragon.installIntegration(t3, { oauthTimeout: null == e3 ? void 0 : e3.oauthTimeout, allowMultipleCredentials: true });
              if ("done" === n3.stage) return void this.handleComplete();
              (null == i3 ? void 0 : i3.credentialId) && (this.credentialId = i3.credentialId);
            }
            this.handleNext(n3);
          }
          handleError(t3, e3) {
            var n3, i3;
            const o2 = (0, g.getConnectSDKError)(t3);
            null === (i3 = null === (n3 = this.startOptions) || void 0 === n3 ? void 0 : n3.onError) || void 0 === i3 || i3.call(n3, o2, null != e3 ? e3 : null);
          }
          handleNext(t3) {
            var e3, n3;
            null === (n3 = null === (e3 = this.startOptions) || void 0 === e3 ? void 0 : e3.onNext) || void 0 === n3 || n3.call(e3, t3);
          }
          handleComplete() {
            var t3, e3;
            null === (e3 = null === (t3 = this.startOptions) || void 0 === t3 ? void 0 : t3.onComplete) || void 0 === e3 || e3.call(t3);
          }
          getScheme() {
            var t3, e3;
            if (null === this.integrationName) return null;
            if (!this.accountType) return null !== (t3 = this.paragon.getIntegrationBySlug(this.integrationName).authenticationType) && void 0 !== t3 ? t3 : null;
            const n3 = this.getSelectedAccountTypeOption();
            return null !== (e3 = null == n3 ? void 0 : n3.scheme) && void 0 !== e3 ? e3 : null;
          }
          getIntegrationName() {
            if (!this.integrationName) throw new g.NoActiveInstallFlowError();
            return this.integrationName;
          }
          getSelectedAccountTypeOption() {
            var t3;
            return null === (t3 = this.paragon.getAccountTypeOptions(this.getIntegrationName())) || void 0 === t3 ? void 0 : t3.find(((t4) => t4.id === this.accountType));
          }
          requiresAccountType() {
            const t3 = this.paragon.getAccountTypeOptions(this.getIntegrationName());
            return !(!t3 || 0 === t3.length) && !this.accountType;
          }
          requiresPreOptions() {
            var t3;
            const e3 = this.paragon.getPreOptions(this.getIntegrationName(), null !== (t3 = this.accountType) && void 0 !== t3 ? t3 : void 0);
            return !(!e3 || 0 === e3.length) && !this.preOptions;
          }
          requiresPostOptions() {
            var t3, e3;
            if (null !== (e3 = null === (t3 = this.getSelectedAccountTypeOption()) || void 0 === t3 ? void 0 : t3.skipPostOAuthInputs) && void 0 !== e3 && e3) return false;
            const n3 = this.paragon.getPostOptions(this.getIntegrationName());
            return !(!n3 || 0 === n3.length) && !this.postOptions;
          }
          async setAccountType(t3) {
            try {
              this.accountType = t3;
              const e3 = this.next();
              if (this.getScheme() !== a.AuthenticationScheme.OAUTH) return void this.handleNext(e3);
              const n3 = "done" === e3.stage, i3 = await new Promise(((e4, n4) => {
                var i4;
                this.paragon.startOAuthFlow(this.getIntegrationName(), { accountType: t3 }, { onSuccess: (t4) => e4(t4), onError: (t4) => n4(t4), oauthTimeout: null === (i4 = this.startOptions) || void 0 === i4 ? void 0 : i4.oauthTimeout });
              }));
              this.credentialId = i3, n3 ? this.handleComplete() : this.handleNext(e3);
            } catch (t4) {
              this.handleError(t4, { stage: "accountType" });
            }
          }
          async setPreOptions(t3) {
            var e3, n3;
            try {
              if (!t3) throw new Error("Pre options are not set");
              this.preOptions = t3;
              const i3 = this.next(), o2 = "done" === i3.stage;
              if (this.getScheme() === a.AuthenticationScheme.OAUTH) {
                const t4 = await new Promise(((t5, e4) => {
                  var n4;
                  this.paragon.startOAuthFlow(this.getIntegrationName(), { endUserSuppliedValues: { ...this.preOptions } }, { onSuccess: (e5) => t5(e5), onError: (t6) => e4(t6), oauthTimeout: null === (n4 = this.startOptions) || void 0 === n4 ? void 0 : n4.oauthTimeout });
                }));
                return this.credentialId = t4, void (o2 ? this.handleComplete() : this.handleNext(i3));
              }
              const r2 = null !== (n3 = null === (e3 = this.getSelectedAccountTypeOption()) || void 0 === e3 ? void 0 : e3.skipPostOAuthInputs) && void 0 !== n3 && n3;
              await this.paragon._oauthCallback({ payload: { ...t3, skipPostOAuthInputs: r2 }, integrationId: this.paragon.getIntegrationId(this.getIntegrationName()) }), o2 ? this.handleComplete() : this.handleNext(i3);
            } catch (t4) {
              this.handleError(t4, { stage: "preOptions" });
            }
          }
          async setPostOptions(t3) {
            var e3, n3;
            try {
              if (!t3) throw new Error("Post options are not set");
              if (!this.credentialId) throw new Error("Credential ID is not set");
              this.postOptions = t3;
              const i3 = null !== (n3 = null === (e3 = this.getSelectedAccountTypeOption()) || void 0 === e3 ? void 0 : e3.skipPostOAuthInputs) && void 0 !== n3 && n3;
              await this.paragon._oauthCallback({ payload: { ...t3, skipPostOAuthInputs: i3 }, integrationId: this.paragon.getIntegrationId(this.getIntegrationName()) }, this.credentialId);
              const o2 = this.next();
              "done" === o2.stage ? this.handleComplete() : this.handleNext(o2);
            } catch (t4) {
              this.handleError(t4, { stage: "postOptions" });
            }
          }
          getAccountType() {
            return this.accountType;
          }
          getPreOptions() {
            return this.preOptions;
          }
          getPostOptions() {
            return this.postOptions;
          }
          next() {
            var t3;
            const e3 = this.getIntegrationName();
            return this.requiresAccountType() ? { stage: "accountType", options: this.paragon.getAccountTypeOptions(e3), done: false } : this.requiresPreOptions() ? { stage: "preOptions", options: this.paragon.getPreOptions(e3, null !== (t3 = this.accountType) && void 0 !== t3 ? t3 : void 0), done: false } : this.requiresPostOptions() ? { stage: "postOptions", options: this.paragon.getPostOptions(e3), done: false } : { stage: "done", done: true };
          }
        }
        e2.InstallFlow = m;
        const w = [{ id: "clientId", title: "Client ID", type: p.SidebarInputType.ValueText, required: true }, { id: "clientSecret", title: "Client Secret", type: p.SidebarInputType.Password, required: true }];
      }, 9892: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true });
        const i2 = n2(3821);
        e2.default = class {
          constructor() {
            this.eventListenersMap = {}, this.integrationStateCallbacks = {};
          }
          subscribe(t3, e3) {
            var n3;
            if (this.assertEventType(t3), "function" != typeof e3) throw new Error(`no listener is provided for ${t3}`);
            return this.eventListenersMap = { ...this.eventListenersMap, [t3]: [...null !== (n3 = this.eventListenersMap[t3]) && void 0 !== n3 ? n3 : [], e3] }, () => this.unsubscribe(t3, e3);
          }
          subscribeToIntegration(t3, e3) {
            this.integrationStateCallbacks[t3] = { ...e3 };
          }
          unsubscribe(t3, e3) {
            var n3, i3;
            if (this.assertEventType(t3), "function" != typeof e3) throw new Error("listener is required for unsubscription");
            const o = (null !== (n3 = this.eventListenersMap[t3]) && void 0 !== n3 ? n3 : []).length;
            return this.eventListenersMap = { ...this.eventListenersMap, [t3]: (null !== (i3 = this.eventListenersMap[t3]) && void 0 !== i3 ? i3 : []).filter(((t4) => t4 !== e3)) }, o > this.eventListenersMap[t3].length;
          }
          assertEventType(t3) {
            if (!Object.values(i2.SDK_EVENT).includes(t3)) throw new Error(`${t3} is not valid paragon event`);
          }
          emitSafe(t3) {
            for (var e3 = arguments.length, n3 = new Array(e3 > 1 ? e3 - 1 : 0), i3 = 1; i3 < e3; i3++) n3[i3 - 1] = arguments[i3];
            var o;
            (null !== (o = this.eventListenersMap[t3]) && void 0 !== o ? o : []).forEach(((t4) => {
              try {
                t4(...n3);
              } catch (t5) {
                console.error(t5);
              }
            }));
          }
          emitError(t3, e3) {
            this.invokeCallbackSafe(e3, "onError", t3);
          }
          invokeCallbackSafe(t3, e3) {
            var n3, i3;
            try {
              for (var o = arguments.length, r = new Array(o > 2 ? o - 2 : 0), s = 2; s < o; s++) r[s - 2] = arguments[s];
              null === (i3 = null === (n3 = this.integrationStateCallbacks[t3]) || void 0 === n3 ? void 0 : n3[e3]) || void 0 === i3 || i3.call(n3, ...r);
            } catch (t4) {
              console.error(t4);
            }
          }
          triggerEvent(t3, e3) {
            let { type: n3, integrationId: o, integrationType: r, workflowId: s, workflowStateChange: a } = t3;
            if (o && r) switch (n3) {
              case i2.SDK_EVENT.ON_INTEGRATION_INSTALL: {
                const t4 = [{ integrationId: o, integrationType: r }, e3];
                this.invokeCallbackSafe(r, "onInstall", ...t4), this.emitSafe(i2.SDK_EVENT.ON_INTEGRATION_INSTALL, ...t4);
                break;
              }
              case i2.SDK_EVENT.ON_INTEGRATION_UNINSTALL: {
                const t4 = [{ integrationId: o, integrationType: r }, e3];
                this.invokeCallbackSafe(r, "onUninstall", ...t4), this.emitSafe(i2.SDK_EVENT.ON_INTEGRATION_UNINSTALL, ...t4);
                break;
              }
              case i2.SDK_EVENT.ON_PORTAL_OPEN: {
                const t4 = [{ integrationId: o, integrationType: r }, e3];
                this.invokeCallbackSafe(r, "onOpen", ...t4), this.emitSafe(i2.SDK_EVENT.ON_PORTAL_OPEN, ...t4);
                break;
              }
              case i2.SDK_EVENT.ON_PORTAL_CLOSE: {
                const t4 = [{ integrationId: o, integrationType: r }, e3];
                this.invokeCallbackSafe(r, "onClose", ...t4), this.emitSafe(i2.SDK_EVENT.ON_PORTAL_CLOSE, ...t4);
                break;
              }
              case i2.SDK_EVENT.ON_WORKFLOW_CHANGE: {
                const t4 = [{ integrationId: o, workflowId: s, workflowStateChange: a || {} }, e3];
                this.invokeCallbackSafe(r, "onWorkflowChange", ...t4), this.emitSafe(i2.SDK_EVENT.ON_WORKFLOW_CHANGE, ...t4);
                break;
              }
              default:
                throw new Error(`${n3} is not valid event.`);
            }
          }
        };
      }, 3931: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.PERSONA_META_HEADER = e2.BYO_USER_PROFILE_ERROR_CODE = e2.BYO_CREDENTIAL_VERIFICATION_ERROR = e2.INSUFFICIENT_PERMISSION = e2.ACTION_CUSTOM = void 0, e2.ACTION_CUSTOM = "custom", e2.INSUFFICIENT_PERMISSION = "7210", e2.BYO_CREDENTIAL_VERIFICATION_ERROR = "7003", e2.BYO_USER_PROFILE_ERROR_CODE = "0704", e2.PERSONA_META_HEADER = "X-Paragon-User-Metadata";
      }, 4059: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.CredentialStatus = void 0, (function(t3) {
          t3.PENDING = "PENDING", t3.INVALID = "INVALID", t3.VALID = "VALID";
        })(e2.CredentialStatus || (e2.CredentialStatus = {}));
      }, 745: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.AuthenticationScheme = void 0, (function(t3) {
          t3.BASIC = "basic", t3.OAUTH = "oauth", t3.OAUTH_CLIENT_CREDENTIAL = "oauth_client_credential", t3.SERVICE_ACCOUNT = "service_account", t3.OAUTH_APP = "oauth_app", t3.IMPERSONATED_APP = "impersonated_app";
        })(e2.AuthenticationScheme || (e2.AuthenticationScheme = {}));
      }, 1663: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.generateSlugForIntegration = void 0, e2.generateSlugForIntegration = function(t3) {
          if (!t3.name) return;
          return `custom.${t3.name ? t3.name.replace(/[\W_]+/g, "").trim().toLowerCase() : void 0}`;
        };
      }, 7343: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.isCustomIntegrationTypeName = e2.getIntegrationTypeName = void 0;
        const i2 = n2(3931), o = n2(1663);
        e2.getIntegrationTypeName = function(t3) {
          if (t3.type === i2.ACTION_CUSTOM) {
            if (t3.customIntegration) return (0, o.generateSlugForIntegration)(t3.customIntegration);
            throw new Error(`Custom integration details are missing from this integration: ${t3.id}`);
          }
          return t3.type;
        }, e2.isCustomIntegrationTypeName = function(t3) {
          return t3.startsWith("custom.");
        };
      }, 9845: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.MicrosoftPicker = void 0;
        const i2 = n2(3821), o = n2(7473);
        class r extends o.BaseFilePicker {
          constructor(t3, e3) {
            super(t3, e3), this.options = t3, this.connectSDKInstance = e3, this.accessToken = "", this.baseUrl = "";
          }
          getInstance() {
            return null;
          }
          open() {
            var t3, e3;
            return this.dependencyStatus === i2.FilePickerStatus.LOADED && (null === (e3 = (t3 = this.options).onOpen) || void 0 === e3 || e3.call(t3), this.launchPicker(this.getPickerOptions()), true);
          }
          async initPicker(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "https://alcdn.msauth.net/browser/2.19.0/js/msal-browser.min.js";
            var o2;
            this.dependencyStatus = i2.FilePickerStatus.LOADING;
            const { selectedCredentialId: r2, ...s } = t3 || {};
            this.initOptions = s;
            const a = await this.connectSDKInstance.getIntegrationAccount(e3, { includeAccountAuth: true, selectedCredentialId: r2 });
            return this.accessToken = a.accountAuth[(null === (o2 = i2.AUTH_TOKEN_ALLOWED_INTEGRATIONS[e3]) || void 0 === o2 ? void 0 : o2.accessTokenPath) || ""], this.baseUrl = this.getUrl(a, e3), this.initialiseDependencyPromise(), this.injectScript(n3), this.dependenciesPromise;
          }
          onScriptLoaded() {
            this.dependencyStatus = i2.FilePickerStatus.LOADED, this.dependenciesPromise.resolve(true);
          }
          onScriptError() {
            this.dependencyStatus = i2.FilePickerStatus.FAILED, this.dependenciesPromise.reject(new Error("Failed to load dependencies"));
          }
          combinePaths() {
            for (var t3 = arguments.length, e3 = new Array(t3), n3 = 0; n3 < t3; n3++) e3[n3] = arguments[n3];
            return e3.map(((t4) => t4.replace(/^[/\\]+|[/\\]+$/g, ""))).join("/").replace(/\\/g, "/");
          }
          async launchPicker(t3) {
            if (!this.accessToken) throw new Error("Access Token is not set! Please re-authenticate your account.");
            const e3 = { sdk: "8.0", entry: t3.entry, search: { enabled: true }, messaging: { origin: window.location.origin, channelId: `X-PARAGON-CHANNEL-${Date.now()}` }, selection: { mode: this.options.allowMultiSelect ? "multiple" : "single" }, typesAndSources: { mode: "boolean" == typeof this.options.allowFolderSelect ? this.options.allowFolderSelect ? "folders" : "files" : "all", filters: this.options.allowedTypes, pivots: t3.pivots } }, n3 = new URLSearchParams({ filePicker: JSON.stringify(e3) }).toString(), i3 = `${this.getPickerUrl(this.baseUrl)}?${n3}`, o2 = window.open("", "Picker", "width=800,height=600,left=100,top=150");
            if (!o2) throw new Error("Failed to open picker window.");
            const r2 = o2.document.createElement("form");
            r2.setAttribute("action", i3), r2.setAttribute("method", "POST");
            const s = o2.document.createElement("input");
            s.setAttribute("type", "hidden"), s.setAttribute("name", "access_token"), s.setAttribute("value", this.accessToken), r2.appendChild(s), o2.document.body.appendChild(r2), r2.submit(), this.setupMessageListener(o2, e3.messaging.channelId);
          }
          initializePort(t3, e3) {
            t3.addEventListener("message", (async (n3) => {
              const { type: i3, data: o2, id: r2 } = n3.data;
              if ("command" === i3) {
                const { command: n4 } = o2;
                this.handlePickerCommand({ command: n4, id: r2, items: o2.items }, e3, t3);
              }
            })), t3.start(), t3.postMessage({ type: "activate" });
          }
          setupMessageListener(t3, e3) {
            window.addEventListener("message", ((n3) => {
              var i3;
              if (n3.source === t3 && (null === (i3 = n3.data) || void 0 === i3 ? void 0 : i3.channelId) === e3) {
                const { type: e4, data: i4 } = n3.data;
                switch (e4) {
                  case "initialize":
                    const o2 = n3.ports[0];
                    this.initializePort(o2, t3);
                    break;
                  case "command":
                    this.handlePickerCommand(i4, t3);
                    break;
                  default:
                    console.warn("Unknown message type:", e4);
                }
              }
            }));
          }
          handlePickerCommand(t3, e3, n3) {
            var i3, o2, r2, s, a, l;
            const { command: d, id: c, items: u } = t3;
            switch (d) {
              case "close":
                null === (o2 = (i3 = this.options).onClose) || void 0 === o2 || o2.call(i3), e3.close();
                break;
              case "pick":
                null == n3 || n3.postMessage({ type: "result", id: c, data: { result: "success" } }), null === (s = (r2 = this.options).onFileSelect) || void 0 === s || s.call(r2, u), null === (l = (a = this.options).onClose) || void 0 === l || l.call(a), e3.close();
                break;
              default:
                null == n3 || n3.postMessage({ type: "error", id: c, data: { message: "Unsupported command", command: d } });
            }
          }
        }
        e2.MicrosoftPicker = r;
      }, 9008: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.BoxFilePicker = void 0;
        const i2 = n2(3821), o = n2(7473), r = { version: "21.0.0", scriptUrl: "https://cdn01.boxcdn.net/platform/elements/21.0.0/en-US/picker.js", cssUrl: "https://cdn01.boxcdn.net/platform/elements/21.0.0/en-US/picker.css", containerClass: "picker", containerStyles: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", height: "80%", zIndex: "2147483647", display: "flex", alignItems: "center", justifyContent: "center" }, pickerOptions: { maxSelectable: 1, canUpload: true, canCreateNewFolder: true, canSetShareAccess: true, canDownload: true, canDelete: false, canRename: false, canPreview: true, canComment: false, canShare: true, canMove: false, canCopy: true } };
        class s extends o.BaseFilePicker {
          constructor(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
            super(t3, e3), this.accessToken = "", this.config = { ...r, ...n3 };
          }
          getInstance() {
            var t3, e3;
            if (!this.instance) {
              const n3 = window;
              if (!this.options.allowFolderSelect && !(null === (t3 = n3.Box) || void 0 === t3 ? void 0 : t3.FilePicker) || this.options.allowFolderSelect && !(null === (e3 = n3.Box) || void 0 === e3 ? void 0 : e3.FolderPicker)) throw new Error("Box script is not loaded yet. Please wait for initialization to complete.");
              const i3 = new n3.Box[this.options.allowFolderSelect ? "FolderPicker" : "FilePicker"]({ container: `.${this.config.containerClass}` });
              if (!i3) throw new Error(`Failed to create Box ${this.options.allowFolderSelect ? "Folder" : "File"}Picker instance`);
              this.instance = i3, this.setupEventListeners();
            }
            return this.instance;
          }
          setupEventListeners() {
            var t3 = this;
            if (!this.instance) return;
            const e3 = { choose: function() {
              let e4 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [];
              var n3, i3;
              null === (i3 = (n3 = t3.options).onFileSelect) || void 0 === i3 || i3.call(n3, e4), t3.cleanup();
            }, cancel: () => {
              var t4, e4;
              null === (e4 = (t4 = this.options).onCancel) || void 0 === e4 || e4.call(t4), this.cleanup();
            }, close: () => {
              var t4, e4;
              null === (e4 = (t4 = this.options).onClose) || void 0 === e4 || e4.call(t4), this.cleanup();
            } };
            Object.entries(e3).forEach(((t4) => {
              let [e4, n3] = t4;
              var i3;
              null === (i3 = this.instance) || void 0 === i3 || i3.addListener(e4, n3);
            }));
          }
          cleanup() {
            var t3;
            this.instance && (this.instance.removeAllListeners(), null === (t3 = document.querySelector(`.${this.config.containerClass}`)) || void 0 === t3 || t3.remove());
          }
          createPickerContainer() {
            if (document.querySelector(`.${this.config.containerClass}`)) return;
            const t3 = document.createElement("div");
            t3.className = this.config.containerClass, Object.entries(this.config.containerStyles).forEach(((e3) => {
              let [n3, i3] = e3;
              t3.style[n3] = i3;
            })), document.body.appendChild(t3);
          }
          injectCSS(t3) {
            const e3 = document.createElement("link");
            e3.rel = "stylesheet", e3.href = t3, document.head.appendChild(e3);
          }
          injectGlobalBtnContentCSS() {
            if (document.getElementById("global-btn-content-style")) return;
            const t3 = document.createElement("style");
            t3.id = "global-btn-content-style", t3.innerHTML = "\n      .btn-content {\n        display: flex !important;\n        justify-content: center !important;\n      }\n    ", document.head.appendChild(t3);
          }
          open() {
            var t3, e3, n3;
            if (this.dependencyStatus === i2.FilePickerStatus.LOADED) try {
              this.instance = void 0;
              const i3 = this.getInstance();
              if (i3) {
                const o2 = { ...this.config.pickerOptions, container: `.${this.config.containerClass}`, maxSelectable: this.options.allowMultiSelect ? void 0 : 1, extensions: this.options.allowedTypes, canSelectFolder: this.options.allowFolderSelect, ...(null === (t3 = this.options.integrationOptions) || void 0 === t3 ? void 0 : t3.box) || {} };
                if (this.createPickerContainer(), this.initOptions.folderId) return i3.show(this.initOptions.folderId, this.accessToken, o2), null === (n3 = (e3 = this.options).onOpen) || void 0 === n3 || n3.call(e3), true;
              }
            } catch (t4) {
              return false;
            }
            return false;
          }
          async init(t3) {
            this.dependencyStatus = i2.FilePickerStatus.LOADING;
            const { selectedCredentialId: e3, ...n3 } = t3 || {};
            await this.validateInitOptions(n3, [["folderId", "Folder ID"]]), this.initOptions = { ...n3 };
            const o2 = await this.connectSDKInstance.getIntegrationAccount("box", { includeAccountAuth: true, selectedCredentialId: e3 }), { accessTokenPath: r2 = "" } = i2.AUTH_TOKEN_ALLOWED_INTEGRATIONS.box;
            return this.accessToken = o2.accountAuth[r2], this.initialiseDependencyPromise(), this.injectCSS(this.config.cssUrl), this.injectGlobalBtnContentCSS(), this.injectScript(this.config.scriptUrl), this.dependenciesPromise;
          }
          async launch() {
            this.dependencyStatus !== i2.FilePickerStatus.LOADED && await this.init(this.initOptions), this.open();
          }
          onScriptLoaded() {
            this.dependencyStatus = i2.FilePickerStatus.LOADED, this.instance = void 0, this.dependenciesPromise.resolve(true);
          }
          onScriptError() {
            this.dependencyStatus = i2.FilePickerStatus.FAILED, this.dependenciesPromise.reject(new Error("Failed to load Box script"));
          }
        }
        e2.BoxFilePicker = s;
      }, 9950: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.GoogleDriveFilePicker = void 0;
        const i2 = n2(3821), o = n2(7473);
        class r extends o.BaseFilePicker {
          constructor(t3, e3) {
            super(t3, e3), this.accessToken = "";
          }
          get google() {
            return window.google;
          }
          getInstance() {
            var t3;
            return null !== (t3 = this.instance) && void 0 !== t3 ? t3 : null;
          }
          open() {
            var t3, e3;
            return !(this.dependencyStatus !== i2.FilePickerStatus.LOADED || !this.instance) && (this.instance.setVisible(true), null === (e3 = (t3 = this.options).onOpen) || void 0 === e3 || e3.call(t3), true);
          }
          async init(t3) {
            this.dependencyStatus = i2.FilePickerStatus.LOADING;
            const { selectedCredentialId: e3, ...n3 } = t3 || {};
            await this.validateInitOptions(n3, [["developerKey", "developer key"]]), this.initOptions = { ...n3 };
            const o2 = await this.connectSDKInstance.getIntegrationAccount("googledrive", { includeAccountAuth: true, selectedCredentialId: e3 }), { accessTokenPath: r2 = "" } = i2.AUTH_TOKEN_ALLOWED_INTEGRATIONS.googledrive;
            return this.accessToken = o2.accountAuth[r2], this.initialiseDependencyPromise(), this.injectScript("https://apis.google.com/js/api.js"), this.dependenciesPromise;
          }
          onScriptLoaded() {
            this.dependencyStatus = i2.FilePickerStatus.LOADED, window.gapi.load("picker", this.onPickerLoaded.bind(this));
          }
          onScriptError() {
            this.dependencyStatus = i2.FilePickerStatus.FAILED, this.dependenciesPromise.reject(new Error("Not able to load dependencies"));
          }
          onPickerLoaded() {
            var t3, e3, n3, i3, o2;
            const r2 = new this.google.picker.PickerBuilder(), s = new this.google.picker.DocsView();
            if ((null === (t3 = this.initOptions) || void 0 === t3 ? void 0 : t3.appId) && r2.setAppId(this.initOptions.appId), this.options.allowMultiSelect && r2.enableFeature(this.google.picker.Feature.MULTISELECT_ENABLED), this.options.allowFolderSelect && (s.setIncludeFolders(true), s.setSelectFolderEnabled(true)), this.options.allowedTypes && this.options.allowedTypes.length > 0 && s.setMimeTypes(this.options.allowedTypes.join(",")), (null === (n3 = null === (e3 = this.options.integrationOptions) || void 0 === e3 ? void 0 : e3.googledrive) || void 0 === n3 ? void 0 : n3.viewMode) && s.setMode(this.options.integrationOptions.googledrive.viewMode), (null === (o2 = null === (i3 = this.options.integrationOptions) || void 0 === i3 ? void 0 : i3.googledrive) || void 0 === o2 ? void 0 : o2.includeFolders) && s.setIncludeFolders(true), !this.initOptions.developerKey) throw new Error("Please provide a valid developer key");
            const a = r2.addView(s).setOAuthToken(this.accessToken).setDeveloperKey(this.initOptions.developerKey).setCallback(this.pickerCallback.bind(this));
            this.initOptions.appId && a.setAppId(this.initOptions.appId), this.instance = a.build(), this.dependenciesPromise.resolve(true);
          }
          pickerCallback(t3) {
            var e3, n3, i3, o2, r2, s;
            const { action: a, ...l } = t3;
            switch (a) {
              case this.google.picker.Action.PICKED:
                null === (n3 = (e3 = this.options).onFileSelect) || void 0 === n3 || n3.call(e3, l), null === (o2 = (i3 = this.options).onClose) || void 0 === o2 || o2.call(i3);
                break;
              case this.google.picker.Action.CANCEL:
                null === (s = (r2 = this.options).onCancel) || void 0 === s || s.call(r2);
            }
          }
        }
        e2.GoogleDriveFilePicker = r;
      }, 1698: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true });
        const i2 = n2(9008), o = n2(9950), r = n2(6128), s = n2(8737);
        e2.default = { BoxFilePicker: i2.BoxFilePicker, GoogleDriveFilePicker: o.GoogleDriveFilePicker, OneDriveFilePicker: r.OneDriveFilePicker, SharepointFilePicker: s.SharepointFilePicker };
      }, 6128: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.OneDriveFilePicker = void 0;
        const i2 = n2(3821), o = n2(9845);
        class r extends o.MicrosoftPicker {
          constructor() {
            super(...arguments), this.integrationName = "onedrive", this.personalAccountUrl = "https://onedrive.live.com";
          }
          async init(t3) {
            return super.initPicker(t3, this.integrationName);
          }
          getPickerUrl(t3) {
            return t3 ? t3.includes(this.personalAccountUrl) ? `${t3}/picker` : this.combinePaths(t3, "_layouts/15/FilePicker.aspx") : `${this.personalAccountUrl}/picker`;
          }
          getIntegrationName() {
            return this.integrationName;
          }
          getUrl(t3, e3) {
            return t3.accountAuth[i2.AUTH_TOKEN_ALLOWED_INTEGRATIONS[e3].domain || ""];
          }
          getPickerOptions() {
            return { entry: { oneDrive: { files: { fallbackToRoot: true } } }, pivots: { oneDrive: true, recent: true, shared: true } };
          }
        }
        e2.OneDriveFilePicker = r;
      }, 8737: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.SharepointFilePicker = void 0;
        const i2 = n2(8321), o = n2(9845);
        class r extends o.MicrosoftPicker {
          constructor() {
            super(...arguments), this.integrationName = "sharepoint";
          }
          async init(t3) {
            return super.initPicker(t3, this.integrationName);
          }
          getIntegrationName() {
            return this.integrationName;
          }
          getPickerUrl(t3) {
            return this.combinePaths(t3, "_layouts/15/FilePicker.aspx");
          }
          getUrl(t3) {
            var e3;
            return (0, i2.sanitizeUrl)(null === (e3 = t3.providerData) || void 0 === e3 ? void 0 : e3.webUrl);
          }
          getPickerOptions() {
            return { entry: { sharePoint: { byPath: { list: `${this.baseUrl}/Shared Documents`, fallbackToRoot: true } } }, pivots: { shared: true, oneDrive: false, sharedLibraries: true, site: true } };
          }
        }
        e2.SharepointFilePicker = r;
      }, 7473: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.BaseFilePicker = void 0;
        const i2 = n2(2643), o = n2(572);
        e2.BaseFilePicker = class {
          constructor(t3, e3) {
            this.options = t3, this.connectSDKInstance = e3;
          }
          initialiseDependencyPromise() {
            this.dependenciesPromise = new o.DeferredPromise();
          }
          getInstance() {
            return this.instance;
          }
          injectScript(t3) {
            if (this.checkIfScriptLoaded(t3)) this.onScriptLoaded();
            else {
              const e3 = document.createElement("script");
              e3.src = t3, e3.async = true, e3.id = t3, e3.onload = this.onScriptLoaded.bind(this), e3.onerror = this.onScriptError.bind(this), document.body.appendChild(e3);
            }
          }
          checkIfScriptLoaded(t3) {
            const e3 = document.getElementsByTagName("script");
            for (let n3 = 0; n3 < e3.length; n3++) if (e3[n3].getAttribute("src") == t3) return true;
            return false;
          }
          async validateInitOptions(t3, e3) {
            for (const [n3, o2] of e3) if (!t3 || (0, i2.isStringEmpty)(t3[n3])) throw new Error(`Please provide a valid ${o2}`);
            return true;
          }
        };
      }, 4731: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.buildExternalFilePickerInstance = void 0;
        const i2 = n2(655).__importDefault(n2(1698));
        class o {
          constructor(t3, e3, n3) {
            const i3 = this.createFilePicker(t3, e3, n3);
            this.open = this.open.bind(i3), this.init = this.init.bind(i3), this.getInstance = this.getInstance.bind(i3);
          }
          createFilePicker(t3, e3, n3) {
            const o2 = { box: i2.default.BoxFilePicker, googledrive: i2.default.GoogleDriveFilePicker, onedrive: i2.default.OneDriveFilePicker, sharepoint: i2.default.SharepointFilePicker }[t3];
            if (!o2) throw new Error(`${t3}'s file picker is not supported`);
            return new o2(e3, n3);
          }
          open() {
            return this.open();
          }
          init(t3) {
            return this.init(t3);
          }
          getInstance() {
            return this.getInstance();
          }
        }
        e2.default = o;
        e2.buildExternalFilePickerInstance = (t3) => function(e3, n3) {
          if (!t3.getUser().authenticated) throw new Error("Authentication is required");
          if (!e3) throw new Error("Missing argument: Integration type is required");
          return t3.validateAction(e3), new o(e3, n3, t3);
        };
      }, 7050: function(t2, e2, n2) {
        "use strict";
        var i2 = this && this.__importDefault || function(t3) {
          return t3 && t3.__esModule ? t3 : { default: t3 };
        };
        Object.defineProperty(e2, "__esModule", { value: true }), e2.buildExternalFilePickerInstance = e2.ExternalFilePicker = void 0;
        var o = n2(4731);
        Object.defineProperty(e2, "ExternalFilePicker", { enumerable: true, get: function() {
          return i2(o).default;
        } }), Object.defineProperty(e2, "buildExternalFilePickerInstance", { enumerable: true, get: function() {
          return o.buildExternalFilePickerInstance;
        } });
      }, 2643: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.findSelectedAccountType = e2.isStringEmpty = e2.getActionStateForCredentialDelete = e2.stripUndefinedAndNull = e2.parseKeyedSource = void 0;
        const i2 = n2(4059);
        e2.parseKeyedSource = function(t3) {
          return t3 && (null == t3 ? void 0 : t3.length) ? Object.fromEntries(t3.map(((t4) => [t4.key, "VALUE" === t4.source.type ? t4.source.value : void 0]))) : {};
        }, e2.stripUndefinedAndNull = function t3(e3) {
          const n3 = {};
          return Object.keys(e3).forEach(((i3) => {
            var o;
            (o = e3[i3]) && "object" == typeof o && !Array.isArray(o) ? n3[i3] = t3(e3[i3]) : void 0 !== e3[i3] && null !== e3[i3] && (n3[i3] = e3[i3]);
          })), n3;
        };
        e2.getActionStateForCredentialDelete = (t3, e3) => {
          var n3, o;
          const r = (null !== (n3 = null == e3 ? void 0 : e3.allCredentials) && void 0 !== n3 ? n3 : []).filter(((e4) => e4.id !== t3)), s = (null !== (o = null == e3 ? void 0 : e3.allConfigurations) && void 0 !== o ? o : []).filter(((e4) => e4.connectCredentialId !== t3));
          if (0 === r.length) return { enabled: false, workflowSettings: {}, allCredentials: [], allConfigurations: [] };
          {
            const t4 = r[0];
            return { ...e3, credentialStatus: t4.status, enabled: t4.status === i2.CredentialStatus.VALID, credentialId: t4.id, providerId: t4.providerId, providerData: t4.providerData, allCredentials: r, allConfigurations: s };
          }
        };
        e2.isStringEmpty = (t3) => !t3 || "string" == typeof t3 && !t3.trim();
        e2.findSelectedAccountType = function(t3, e3) {
          let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : [];
          if (e3) return t3.find(((t4) => {
            let { id: n4 } = t4;
            return n4 === e3;
          }));
          if (1 === n3.length) return t3.find(((t4) => {
            let { id: e4 } = t4;
            return n3.includes(e4);
          }));
          if (!e3 && !n3.length && Array.isArray(t3) && 2 === t3.length) {
            const [e4, n4] = t3;
            return "default" === e4.id && "user-configured-oauth" === n4.id ? e4 : void 0;
          }
        };
      }, 4429: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.startOAuthFlow = e2.MAX_POLL_DURATION = e2.CREDENTIAL_POLL_INTERVAL = void 0;
        const i2 = n2(3931), o = n2(7343), r = n2(2643);
        e2.CREDENTIAL_POLL_INTERVAL = 3e3, e2.MAX_POLL_DURATION = 6e4;
        e2.startOAuthFlow = (t3, e3) => {
          let { context: n3, integration: s, endUserSuppliedValues: a = {}, authParams: l, isPreviewMode: d = false, installOptions: c = {} } = t3;
          var u;
          const h = (0, o.getIntegrationTypeName)(s);
          if (!h) return;
          const p = l ? (0, r.parseKeyedSource)(l) : {}, g = (0, r.stripUndefinedAndNull)({ action: h && (0, o.isCustomIntegrationTypeName)(h) ? i2.ACTION_CUSTOM : h, endUserSuppliedValues: JSON.stringify(a), parameters: JSON.stringify(p), userToken: n3.user.token, integrationId: s.id, redirectUrl: null === (u = n3.endUserIntegrationConfig) || void 0 === u ? void 0 : u.overrideRedirectUrl, originForPostMessage: window.location.origin, isPreviewMode: d, installOptions: JSON.stringify(c), sessionId: e3 }), f = `${n3.environments.ZEUS_PUBLIC_URL}/projects/${n3.projectId}/sdk/actions/build-oauth?${new URLSearchParams(g).toString()}`;
          return window.open(f, void 0, "width=500,height=600,left=100,top=150");
        };
      }, 3056: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.paragon = e2.connectSingleton = void 0;
        const i2 = n2(655), o = i2.__importDefault(n2(773)), r = n2(7050);
        i2.__exportStar(n2(3821), e2), e2.connectSingleton = new o.default(), e2.paragon = { _loadCustomDropdownOptions: e2.connectSingleton._loadCustomDropdownOptions.bind(e2.connectSingleton), _oauthCallback: e2.connectSingleton._oauthCallback.bind(e2.connectSingleton), _oauthErrorCallback: e2.connectSingleton._oauthErrorCallback.bind(e2.connectSingleton), authenticate: e2.connectSingleton.authenticate.bind(e2.connectSingleton), closePortal: e2.connectSingleton.closePortal.bind(e2.connectSingleton), completeInstall: e2.connectSingleton.completeInstall.bind(e2.connectSingleton), configureGlobal: e2.connectSingleton.configureGlobal.bind(e2.connectSingleton), connect: e2.connectSingleton.connect.bind(e2.connectSingleton), connectAction: e2.connectSingleton.connectAction.bind(e2.connectSingleton), createConfiguration: e2.connectSingleton.createConfiguration.bind(e2.connectSingleton), destroyConfiguration: e2.connectSingleton.destroyConfiguration.bind(e2.connectSingleton), disableWorkflow: e2.connectSingleton.disableWorkflow.bind(e2.connectSingleton), enableWorkflow: e2.connectSingleton.enableWorkflow.bind(e2.connectSingleton), event: e2.connectSingleton.event.bind(e2.connectSingleton), getIntegrationAccount: e2.connectSingleton.getIntegrationAccount.bind(e2.connectSingleton), getIntegrationMetadata: e2.connectSingleton.getIntegrationMetadata.bind(e2.connectSingleton), getUser: e2.connectSingleton.getUser.bind(e2.connectSingleton), installIntegration: e2.connectSingleton.installIntegration.bind(e2.connectSingleton), request: e2.connectSingleton.request.bind(e2.connectSingleton), setUserMetadata: e2.connectSingleton.setUserMetadata.bind(e2.connectSingleton), subscribe: e2.connectSingleton.subscribe.bind(e2.connectSingleton), uninstallIntegration: e2.connectSingleton.uninstallIntegration.bind(e2.connectSingleton), unsubscribe: e2.connectSingleton.unsubscribe.bind(e2.connectSingleton), updateConfiguration: e2.connectSingleton.updateConfiguration.bind(e2.connectSingleton), workflow: e2.connectSingleton.workflow.bind(e2.connectSingleton), ExternalFilePicker: (0, r.buildExternalFilePickerInstance)(e2.connectSingleton), getIntegrationConfig: e2.connectSingleton.getIntegrationConfig.bind(e2.connectSingleton), updateIntegrationUserSettings: e2.connectSingleton.updateIntegrationUserSettings.bind(e2.connectSingleton), updateWorkflowUserSettings: e2.connectSingleton.updateWorkflowUserSettings.bind(e2.connectSingleton), updateWorkflowState: e2.connectSingleton.updateWorkflowState.bind(e2.connectSingleton), setHeadless: e2.connectSingleton.setHeadless.bind(e2.connectSingleton), getIntegrationId: e2.connectSingleton.getIntegrationId.bind(e2.connectSingleton), getAccountTypeOptions: e2.connectSingleton.getAccountTypeOptions.bind(e2.connectSingleton), getPreOptions: e2.connectSingleton.getPreOptions.bind(e2.connectSingleton), getPostOptions: e2.connectSingleton.getPostOptions.bind(e2.connectSingleton), startOAuthFlow: e2.connectSingleton.startOAuthFlow.bind(e2.connectSingleton), installFlow: e2.connectSingleton.installFlow, getFieldOptions: e2.connectSingleton.getFieldOptions.bind(e2.connectSingleton), getDataSourceOptions: e2.connectSingleton.getDataSourceOptions.bind(e2.connectSingleton) }, e2.default = o.default;
      }, 2992: (t2, e2) => {
        "use strict";
        var n2, i2, o;
        Object.defineProperty(e2, "__esModule", { value: true }), e2.AUTH_TOKEN_ALLOWED_INTEGRATIONS = e2.overrideActionAlias = e2.TokenType = e2.VariableInputType = e2.SidebarInputType = void 0, (function(t3) {
          t3.Auth = "AUTH", t3.Enum = "ENUM", t3.DynamicEnum = "DYNAMIC_ENUM", t3.Intent = "INTENT", t3.Text = "TEXT", t3.TextArea = "TEXTAREA", t3.ValueText = "TEXT_NO_VARS", t3.ValueTextArea = "TEXTAREA_NO_VARS", t3.Code = "CODE", t3.ActionButton = "ACTION_BUTTON", t3.Conditional = "CONDITIONAL", t3.CustomDropdown = "CUSTOM_DROPDOWN", t3.DynamicConditional = "DYNAMIC_CONDITIONAL", t3.NestedList = "NESTED_LIST", t3.File = "FILE", t3.EditableDynamicEnum = "EDITABLE_DYNAMIC_ENUM", t3.EditableEnum = "EDITABLE_ENUM", t3.BooleanInput = "BOOLEAN_INPUT", t3.UserSuppliedCredential = "USER_SUPPLIED_CREDENTIAL", t3.NativeDynamicEnumInput = "NATIVE_DYNAMIC_INPUT", t3.TimeConstraintInput = "TIME_CONSTRAINT_INPUT", t3.LinesListInput = "LinesListInput", t3.LinesListDynamicInput = "LinesListDynamicInput", t3.Number = "NUMBER", t3.Email = "EMAIL", t3.URL = "URL", t3.EnumTextAreaPairInput = "EnumTextAreaPairInput", t3.FieldMapper = "FIELD_MAPPER", t3.ComboInput = "COMBO_INPUT", t3.Password = "PASSWORD", t3.Switch = "SWITCH", t3.DynamicComboInput = "DYNAMIC_COMBO_INPUT", t3.CopyableButtonInput = "COPYABLE_BUTTON_INPUT", t3.Permission = "PERMISSION";
        })(e2.SidebarInputType || (e2.SidebarInputType = {})), (function(t3) {
          t3.MultiSelect = "multi", t3.String = "string", t3.Dropdown = "dropdown", t3.MultiSelectCheckbox = "multiCheckbox", t3.Number = "number";
        })(e2.VariableInputType || (e2.VariableInputType = {})), (function(t3) {
          t3.ACCESS_TOKEN = "ACCESS_TOKEN", t3.REFRESH_TOKEN = "REFRESH_TOKEN", t3.BOT_TOKEN = "BOT_TOKEN", t3.KLAVIYO_API_KEY = "KLAVIYO_API_KEY", t3.MARKETO_CLIENT_ID = "MARKETO_CLIENT_ID", t3.MARKETO_CLIENT_SECRET = "MARKETO_CLIENT_SECRETI", t3.MARKETO_ENDPOINT = "MARKETO_ENDPOINT", t3.MARKETO_IDENTITY = "MARKETO_IDENTITY", t3.MONDAY_API_TOKEN = "MONDAY_API_TOKEN", t3.ORACLE_CLOUD_URL = "ORACLE_CLOUD_URL", t3.ORACLE_PASSWORD = "ORACLE_PASSWORD", t3.ORACLE_USERNAME = "ORACLE_USERNAME", t3.SAGE_INTACCT_COMPANY_ID = "SAGE_INTACCT_COMPANY_ID", t3.SAGE_INTACCT_USER_ID = "SAGE_INTACCT_USER_ID", t3.SAGE_INTACCT_USER_PASSWORD = "SAGE_INTACCT_USER_PASSWORD", t3.SAILTHRU_COMPANY_KEY = "SAILTHRU_COMPANY_KEY", t3.SAILTHRU_COMPANY_SECRET = "SAILTHRU_COMPANY_SECRET", t3.SERVICENOW_PASSWORD = "SERVICENOW_PASSWORD", t3.SERVICENOW_SUBDOMAIN = "SERVICENOW_SUBDOMAIN", t3.SERVICENOW_USERNAME = "SERVICENOW_USERNAME", t3.TABLEAU_PERSONAL_ACCESS_TOKEN_NAME = "TABLEAU_PERSONAL_ACCESS_TOKEN_NAME", t3.TABLEAU_PERSONAL_ACCESS_TOKEN_SECRET = "TABLEAU_PERSONAL_ACCESS_TOKEN_SECRET", t3.TABLEAU_SERVER_NAME = "TABLEAU_SERVER_NAME", t3.TABLEAU_SITE_ID = "TABLEAU_SITE_ID", t3.TRELLO_API_KEY = "TRELLO_API_KEY", t3.TRELLO_API_TOKEN = "TRELLO_API_TOKEN", t3.WOOCOMMERCE_CONSUMER_KEY = "WOOCOMMERCE_CONSUMER_KEY", t3.WOOCOMMERCE_CONSUMER_SECRET = "WOOCOMMERCE_CONSUMER_SECRET", t3.WOOCOMMERCE_STORE_DOMAIN = "WOOCOMMERCE_STORE_DOMAIN", t3.WORKABLE_API_ACCESS_TOKEN = "WORKABLE_API_ACCESS_TOKEN", t3.WORKABLE_ACCOUNT_SUBDOMAIN = "WORKABLE_ACCOUNT_SUBDOMAIN", t3.ZOHO_CRM_ACCOUNTS_SERVER = "ZOHO_CRM_ACCOUNTS_SERVER", t3.ZOHO_CRM_API_DOMAIN = "ZOHO_CRM_API_DOMAIN";
        })(e2.TokenType || (e2.TokenType = {})), (function(t3) {
          t3.INFO = "INFO", t3.ERROR = "ERROR", t3.SUCCESS = "SUCCESS";
        })(n2 || (n2 = {})), (function(t3) {
          t3.NONE = "NONE", t3.RE_AUTHENTICATE = "RE_AUTHENTICATE", t3.ALERT = "ALERT", t3.DISPATCH = "DISPATCH";
        })(i2 || (i2 = {})), (function(t3) {
          t3.DYNAMIC = "DYNAMIC_DATA_SOURCE", t3.STATIC_ENUM = "STATIC_ENUM_DATA_SOURCE", t3.FIELD_MAPPER = "FIELD_MAPPER_DATA_SOURCE", t3.COMBO_INPUT = "COMBO_INPUT_DATA_SOURCE", t3.DYNAMIC_COMBO_INPUT = "DYNAMIC_COMBO_INPUT_DATA_SOURCE";
        })(o || (o = {})), e2.overrideActionAlias = { "monday.com": "monday", "wordpress.com": "wordpress" }, e2.AUTH_TOKEN_ALLOWED_INTEGRATIONS = { box: { accessTokenPath: "OAUTH_ACCESS_TOKEN" }, googledrive: { accessTokenPath: "OAUTH_ACCESS_TOKEN" }, onedrive: { accessTokenPath: "OAUTH_ACCESS_TOKEN", domain: "DOMAIN" }, sharepoint: { accessTokenPath: "OAUTH_ACCESS_TOKEN" } };
      }, 9034: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.CONNECT_PLAN_FEATURE_MAP = void 0;
        const i2 = n2(471);
        e2.CONNECT_PLAN_FEATURE_MAP = { [i2.BillingPlan.ConnectBasic]: [], [i2.BillingPlan.ConnectPro]: [i2.ConnectAddOn.CustomIntegrationBuilder, i2.ConnectAddOn.HeadlessConnectPortal, i2.ConnectAddOn.Monitoring, i2.ConnectAddOn.UserMetadata, i2.ConnectAddOn.WhiteLabeling], [i2.BillingPlan.ConnectEnterprise]: [i2.ConnectAddOn.CustomIntegrationBuilder, i2.ConnectAddOn.DynamicFieldMapper, i2.ConnectAddOn.HeadlessConnectPortal, i2.ConnectAddOn.TaskHistoryAPI, i2.ConnectAddOn.Monitoring, i2.ConnectAddOn.RoleBasedAccessControl, i2.ConnectAddOn.UserMetadata, i2.ConnectAddOn.WhiteLabeling, i2.ConnectAddOn.WorkflowPermission] };
      }, 1935: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.SELECTED_CREDENTIAL_CONFIG_ID_HEADER = e2.SELECTED_CREDENTIAL_ID_HEADER = e2.INFER_CONTENT_TYPE_FROM_CONNECT_OPTIONS = e2.CredentialStatus = void 0;
        const i2 = n2(655), o = n2(2992);
        var r = n2(4059);
        Object.defineProperty(e2, "CredentialStatus", { enumerable: true, get: function() {
          return r.CredentialStatus;
        } }), i2.__exportStar(n2(2460), e2);
        o.SidebarInputType.ValueText, o.SidebarInputType.DynamicEnum, o.SidebarInputType.Enum, o.SidebarInputType.Number, o.SidebarInputType.Email, o.SidebarInputType.URL, o.SidebarInputType.FieldMapper, o.SidebarInputType.BooleanInput, o.SidebarInputType.ComboInput, o.SidebarInputType.Password, o.SidebarInputType.Switch, o.SidebarInputType.ValueTextArea, o.SidebarInputType.CustomDropdown, o.SidebarInputType.DynamicComboInput, o.SidebarInputType.FieldMapper, o.SidebarInputType.CopyableButtonInput, o.SidebarInputType.Permission;
        e2.INFER_CONTENT_TYPE_FROM_CONNECT_OPTIONS = "auto", e2.SELECTED_CREDENTIAL_ID_HEADER = "X-Paragon-Credential", e2.SELECTED_CREDENTIAL_CONFIG_ID_HEADER = "X-Paragon-Configuration-Id";
      }, 9977: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true });
      }, 914: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.PLATFORM_ENV = e2.NODE_ENV = void 0, (function(t3) {
          t3.PRODUCTION = "production", t3.DEVELOPMENT = "development", t3.TEST = "test";
        })(e2.NODE_ENV || (e2.NODE_ENV = {})), (function(t3) {
          t3.PRODUCTION = "production", t3.PRODUCTION_MIRROR_1 = "p-m1", t3.STAGING = "staging", t3.STAGING_MIRROR_1 = "s-m1", t3.DEVELOPMENT = "dev", t3.TEST = "test", t3.SANDBOX = "sandbox", t3.RELEASE = "release", t3.ENTERPRISE = "enterprise";
        })(e2.PLATFORM_ENV || (e2.PLATFORM_ENV = {}));
      }, 2460: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.getConnectSDKError = e2.OAuthTimeoutError = e2.OAuthBlockedError = e2.HeadlessModeNotEnabledError = e2.IntegrationNotInstalledError = e2.IntegrationNotFoundError = e2.NoActiveInstallFlowError = e2.UserNotAuthenticatedError = e2.BaseSDKError = void 0;
        class n2 extends Error {
          constructor(t3) {
            super(t3.message), this.name = t3.name, this.meta = "meta" in t3 ? t3.meta : null;
          }
        }
        e2.BaseSDKError = n2;
        e2.UserNotAuthenticatedError = class extends n2 {
          constructor() {
            super({ name: "UserNotAuthenticatedError", message: "User not authenticated, Call paragon.authenticate(<projectId>, <user token>) before using the SDK." });
          }
        };
        e2.NoActiveInstallFlowError = class extends n2 {
          constructor() {
            super({ name: "NoActiveInstallFlowError", message: "No active install flow, make sure you call installFlow.start(<integrationName>, ...args) before calling any other method" });
          }
        };
        e2.IntegrationNotFoundError = class extends n2 {
          constructor(t3) {
            super({ name: "IntegrationNotFoundError", message: `Integration with name ${t3} not found`, meta: { integrationName: t3 } });
          }
        };
        e2.IntegrationNotInstalledError = class extends n2 {
          constructor(t3) {
            super({ name: "IntegrationNotInstalledError", message: `Integration "${t3}" is not installed.`, meta: { integrationName: t3 } }), this.integrationName = t3;
          }
        };
        e2.HeadlessModeNotEnabledError = class extends n2 {
          constructor() {
            super({ name: "HeadlessModeNotEnabledError", message: "Headless mode is not enabled. Make sure you call `paragon.setHeadless(true)` as early as possible in your code." });
          }
        };
        e2.OAuthBlockedError = class extends n2 {
          constructor() {
            super({ name: "OAuthBlockedError", message: "Popup was blocked by the browser." });
          }
        };
        e2.OAuthTimeoutError = class extends n2 {
          constructor() {
            super({ name: "OAuthTimeoutError", message: "OAuth timeout" });
          }
        }, e2.getConnectSDKError = function(t3) {
          return t3 instanceof n2 ? { name: t3.name, message: t3.message, meta: t3.meta } : { name: "UnknownError", message: t3 instanceof Error ? t3.message : "An unknown error occurred", originalError: t3 };
        };
      }, 8065: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true });
      }, 3821: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true });
        const i2 = n2(655);
        i2.__exportStar(n2(2992), e2), i2.__exportStar(n2(9034), e2), i2.__exportStar(n2(1935), e2), i2.__exportStar(n2(9977), e2), i2.__exportStar(n2(914), e2), i2.__exportStar(n2(8065), e2), i2.__exportStar(n2(9835), e2), i2.__exportStar(n2(7750), e2), i2.__exportStar(n2(471), e2);
      }, 9835: (t2, e2) => {
        "use strict";
        var n2;
        Object.defineProperty(e2, "__esModule", { value: true }), e2.DataType = void 0, (function(t3) {
          t3.STRING = "STRING", t3.NUMBER = "NUMBER", t3.DATE = "DATE", t3.BOOLEAN = "BOOLEAN", t3.EMAIL = "EMAIL", t3.OBJECT = "OBJECT", t3.ARRAY = "ARRAY", t3.ANY = "ANY", t3.FILE = "FILE", t3.NON_DECIMAL = "NON_DECIMAL";
        })(e2.DataType || (e2.DataType = {})), (function(t3) {
          t3.None = "$none", t3.StringContains = "$stringContains", t3.StringDoesNotContain = "$stringDoesNotContain", t3.StringExactlyMatches = "$stringExactlyMatches", t3.StringDoesNotExactlyMatch = "$stringDoesNotExactlyMatch", t3.StringIsIn = "$stringIsIn", t3.StringIsNotIn = "$stringIsNotIn", t3.StringStartsWith = "$stringStartsWith", t3.StringDoesNotStartWith = "$stringDoesNotStartWith", t3.StringEndsWith = "$stringEndsWith", t3.StringDoesNotEndWith = "$stringDoesNotEndWith", t3.NumberGreaterThan = "$numberGreaterThan", t3.NumberLessThan = "$numberLessThan", t3.NumberEquals = "$numberEquals", t3.NumberDoesNotEqual = "$numberDoesNotEqual", t3.NumberLessThanOrEqualTo = "$numberLessThanOrEqualTo", t3.NumberGreaterThanOrEqualTo = "$numberGreaterThanOrEqualTo", t3.DateTimeAfter = "$dateTimeAfter", t3.DateTimeBefore = "$dateTimeBefore", t3.DateTimeEquals = "$dateTimeEquals", t3.BooleanTrue = "$booleanTrue", t3.BooleanFalse = "$booleanFalse", t3.IsNotNull = "$exists", t3.IsNull = "$doesNotExist", t3.Exists = "$isNotUndefinedOrNull", t3.DoesNotExist = "$isUndefinedOrNull", t3.ArrayIsIn = "$arrayIsIn", t3.ArrayIsNotIn = "$arrayIsNotIn", t3.ArrayIsEmpty = "$arrayIsEmpty", t3.ArrayIsNotEmpty = "$arrayIsNotEmpty", t3.StringGreaterThan = "$stringGreaterThan", t3.StringLessThan = "$stringLessThan";
        })(n2 || (n2 = {}));
      }, 7750: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.FilePickerStatus = e2.DocumentLoadingState = e2.SDK_EVENT = e2.ModalView = e2.DynamicFieldMappingLoaderType = void 0, (function(t3) {
          t3.OBJECT_TYPES = "objectTypes", t3.INTEGRATION_FIELDS = "integrationFields";
        })(e2.DynamicFieldMappingLoaderType || (e2.DynamicFieldMappingLoaderType = {})), (function(t3) {
          t3.OVERVIEW = "overview", t3.CONFIGURATION = "configuration";
        })(e2.ModalView || (e2.ModalView = {})), (function(t3) {
          t3.ON_INTEGRATION_INSTALL = "onIntegrationInstall", t3.ON_INTEGRATION_UNINSTALL = "onIntegrationUninstall", t3.ON_WORKFLOW_CHANGE = "onWorkflowChange", t3.ON_PORTAL_OPEN = "onPortalOpen", t3.ON_PORTAL_CLOSE = "onPortalClose";
        })(e2.SDK_EVENT || (e2.SDK_EVENT = {})), (function(t3) {
          t3.LOADING = "loading", t3.INTERACTIVE = "interactive", t3.COMPLETE = "complete";
        })(e2.DocumentLoadingState || (e2.DocumentLoadingState = {})), (function(t3) {
          t3.LOADING = "loading", t3.FAILED = "failed", t3.LOADED = "loaded";
        })(e2.FilePickerStatus || (e2.FilePickerStatus = {}));
      }, 471: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.ConnectAddOn = e2.BillingPlan = void 0, (function(t3) {
          t3.ClassicFree = "free", t3.ClassicStarter = "starter", t3.ClassicBusiness = "business", t3.ClassicPremium = "premium", t3.ClassicEnterprise = "enterprise", t3.ConnectTrial = "connect_trial", t3.ConnectBasic = "basic", t3.ConnectPro = "pro", t3.ConnectEnterprise = "connect_enterprise";
        })(e2.BillingPlan || (e2.BillingPlan = {})), (function(t3) {
          t3.CustomIntegrationBuilder = "byo", t3.DynamicFieldMapper = "dfm", t3.HeadlessConnectPortal = "headless-cp", t3.TaskHistoryAPI = "th-api", t3.Monitoring = "monitoring", t3.RoleBasedAccessControl = "rbac", t3.UserMetadata = "user-metadata", t3.WhiteLabeling = "whitelabel", t3.WorkflowPermission = "workflow-permissions";
        })(e2.ConnectAddOn || (e2.ConnectAddOn = {}));
      }, 3158: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.getHeadersForUserMeta = e2.sanitizeExternalConfigId = e2.getAssetUrl = void 0;
        const i2 = n2(3931), o = n2(3821);
        e2.getAssetUrl = (t3) => {
          let { CDN_PUBLIC_URL: e3, DASHBOARD_PUBLIC_URL: n3, VERSION: i3, PLATFORM_ENV: r, NODE_ENV: s } = t3;
          return e3 && s === o.NODE_ENV.PRODUCTION && r !== o.PLATFORM_ENV.ENTERPRISE ? `${e3}/${i3}/dashboard/public` : n3;
        }, e2.sanitizeExternalConfigId = function(t3) {
          if (t3.startsWith("ext:")) {
            return (t3.split("ext:").pop() || "").trim();
          }
          return t3.trim();
        };
        e2.getHeadersForUserMeta = (t3) => ({ ...t3 ? { [i2.PERSONA_META_HEADER]: JSON.stringify(t3) } : {} });
      }, 4846: (t2, e2, n2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.hash = void 0;
        const i2 = n2(3715);
        e2.hash = function(t3) {
          return null == t3 ? t3 : (0, i2.sha256)().update(t3).digest("hex").substr(0, 10);
        };
      }, 572: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.tryUntil = e2.isUUID = e2.uuidPattern = e2.sleep = e2.generateMatrix = e2.DeferredPromise = void 0;
        function n2(t3) {
          return new Promise(((e3) => setTimeout(e3, t3)));
        }
        e2.DeferredPromise = class {
          get state() {
            return this._state;
          }
          constructor() {
            this._state = "pending", this._promise = new Promise(((t3, e3) => {
              this._resolve = t3, this._reject = e3;
            }));
          }
          then(t3, e3) {
            return this._promise.then(t3, e3);
          }
          catch(t3) {
            return this._promise.catch(t3);
          }
          resolve(t3) {
            this._resolve(t3), this._state = "fulfilled";
          }
          reject(t3) {
            this._reject(t3), this._state = "rejected";
          }
          finally(t3) {
            return null == t3 || t3(), this._promise;
          }
        }, Symbol.toStringTag, e2.generateMatrix = function(t3, e3) {
          const n3 = Object.keys(t3);
          if (n3.reduce(((e4, n4) => e4 + t3[n4].length), 0) && n3.length) for (const e4 of n3) t3[e4].length || t3[e4].push(void 0);
          const i2 = Object.entries(t3).reduce(((t4, e4) => {
            let [, n4] = e4;
            return t4.length ? t4.reduce(((t5, e5) => (n4.forEach(((n5) => {
              const i3 = e5.slice();
              i3.push(n5), t5.push(i3);
            }), []), t5)), []) : n4.map(((t5) => [t5]));
          }), []).reduce(((t4, e4) => {
            const i3 = e4.reduce(((t5, e5, i4) => ({ ...t5, [n3[i4]]: e5 })), {});
            return [...t4, i3];
          }), []);
          return e3 ? i2.slice(-1 * e3) : i2;
        }, e2.sleep = n2, e2.uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i, e2.isUUID = function(t3) {
          return "string" == typeof t3 && e2.uuidPattern.test(t3);
        }, e2.tryUntil = async function(t3, e3, i2) {
          let o = 0, r = true;
          for (; r; ) {
            o += 1;
            let s = null, a = null;
            try {
              s = await t3();
            } catch (t4) {
              a = t4;
            }
            if (r = await e3(s, a, o), !r) {
              if (a) throw a;
              return s;
            }
            {
              const t4 = "number" == typeof i2 ? i2 : i2(o);
              await n2(t4);
            }
          }
          throw new Error("Method unable to run: invalid retries.");
        };
      }, 8321: (t2, e2) => {
        "use strict";
        Object.defineProperty(e2, "__esModule", { value: true }), e2.errorMessageParser = e2.isIntegrationError = e2.ProxyRequestError = e2.getErrorMessage = e2.getServiceUrl = e2.sanitizeUrl = e2.isValidUrl = void 0;
        function n2(t3) {
          return t3 ? t3.match(/^[a-zA-Z]+:\/\//) ? t3 : `https://${t3}` : t3;
        }
        function i2(t3) {
          return Array.isArray(t3) ? t3.flatMap(((t4) => [t4, i2(t4.children || [])].flatMap(((t5) => "string" == typeof t5 ? t5 : i2(t5))))).filter(((t4) => t4)).join(", ") : Object.values(t3.constraints || {}).join(", ");
        }
        e2.isValidUrl = (t3) => {
          const e3 = n2(t3);
          try {
            return new globalThis.URL(e3), true;
          } catch (t4) {
            return false;
          }
        }, e2.sanitizeUrl = n2, e2.getServiceUrl = function(t3, e3) {
          return `https://${t3}${`.${e3}`}`;
        }, e2.getErrorMessage = async function(t3, n3) {
          var o2, r;
          const s = null === (o2 = t3.headers) || void 0 === o2 ? void 0 : o2.get("content-type"), a = s && s.includes("application/json") ? await t3.json() : null;
          let l;
          return l = a && (0, e2.isIntegrationError)(a.meta) ? JSON.stringify(a.meta) : a && "string" == typeof a.message ? a.message : a && 400 === t3.status && Array.isArray(a.message) ? i2(a.message) : a ? JSON.stringify(a) : await (null === (r = t3.text) || void 0 === r ? void 0 : r.call(t3)), n3 ? { message: l, response: a || t3 } : l;
        };
        class o extends Error {
          constructor(t3, e3) {
            super(t3), this.name = "Error", this.response = e3, Object.setPrototypeOf(this, o.prototype);
          }
        }
        e2.ProxyRequestError = o;
        e2.isIntegrationError = (t3) => !("object" != typeof t3 || !t3) && t3.isIntegrationError, e2.errorMessageParser = function(t3) {
          t3 = "string" == typeof t3 ? t3 : t3.message;
          try {
            const n3 = JSON.parse(t3);
            return !!(0, e2.isIntegrationError)(n3);
          } catch (t4) {
            return false;
          }
        };
      }, 3035: (t2, e2, n2) => {
        "use strict";
        var i2, o, r, s, a = n2(4155);
        Object.defineProperty(e2, "__esModule", { value: true }), e2.CacheThrottle = e2.CacheMode = void 0;
        const l = n2(655), d = n2(572);
        var c, u, h;
        !(function(t3) {
          t3.Debounce = "debounce", t3.Throttle = "throttle";
        })(c = e2.CacheMode || (e2.CacheMode = {})), (function(t3) {
          t3.Closed = "closed", t3.Idle = "idle", t3.Processing = "processing";
        })(u || (u = {})), (function(t3) {
          t3[t3.Get = 0] = "Get", t3[t3.Set = 1] = "Set", t3[t3.GetOrSet = 2] = "GetOrSet", t3[t3.Del = 3] = "Del", t3[t3.Do = 4] = "Do";
        })(h || (h = {}));
        e2.CacheThrottle = class {
          constructor() {
            let t3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
            i2.set(this, u.Idle), o.set(this, {}), r.set(this, void 0), s.set(this, []), l.__classPrivateFieldSet(this, r, { mode: c.Debounce, ttl: 0, ...t3 }, "f");
          }
          async get(t3, e3) {
            const n3 = this.serializeKey(t3), i3 = async () => {
              const e4 = l.__classPrivateFieldGet(this, o, "f")[n3], { mode: i4, ttl: s2, value: a2 } = null != e4 ? e4 : {};
              return !e4 || !s2 || i4 && i4 !== c.Debounce || this.refreshTimeout(t3, n3, s2), l.__classPrivateFieldGet(this, r, "f").clearPendingDeletes && this.clearPendingDeletesOnKey(n3, a2), a2;
            };
            return e3 ? i3() : this.enqueue(n3, h.Get, i3);
          }
          async set(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : l.__classPrivateFieldGet(this, r, "f").ttl, i3 = arguments.length > 3 ? arguments[3] : void 0, s2 = arguments.length > 4 ? arguments[4] : void 0;
            const a2 = this.serializeKey(t3), d2 = async () => {
              const s3 = l.__classPrivateFieldGet(this, o, "f")[a2], d3 = !!s3;
              return l.__classPrivateFieldGet(this, o, "f")[a2] = { ...s3, mode: i3, ttl: n3, value: e3 }, d3 && i3 === c.Throttle || this.refreshTimeout(t3, a2, n3), l.__classPrivateFieldGet(this, r, "f").clearPendingDeletes && this.clearPendingDeletesOnKey(a2, e3), e3;
            };
            return s2 ? d2() : this.enqueue(a2, h.Set, d2);
          }
          async getOrSet(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : l.__classPrivateFieldGet(this, r, "f").ttl, i3 = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : l.__classPrivateFieldGet(this, r, "f").mode, s2 = arguments.length > 4 ? arguments[4] : void 0;
            const a2 = this.serializeKey(t3), d2 = async () => {
              if (l.__classPrivateFieldGet(this, o, "f")[a2]) return l.__classPrivateFieldGet(this, o, "f")[a2].value;
              const s3 = await e3();
              return await this.set(t3, s3, n3, i3, true), l.__classPrivateFieldGet(this, r, "f").clearPendingDeletes && this.clearPendingDeletesOnKey(a2, s3), s3;
            };
            return s2 ? d2() : this.enqueue(a2, h.GetOrSet, d2);
          }
          async del(t3) {
            let e3 = arguments.length > 2 ? arguments[2] : void 0;
            const n3 = arguments.length > 1 && void 0 !== arguments[1] && arguments[1] ? t3 : this.serializeKey(t3), i3 = async () => {
              const t4 = l.__classPrivateFieldGet(this, o, "f")[n3];
              let e4;
              return (null == t4 ? void 0 : t4.timeout) && clearTimeout(t4.timeout), t4 && (e4 = t4.value, delete l.__classPrivateFieldGet(this, o, "f")[n3], await (async () => {
                var t5, n4;
                return null === (n4 = (t5 = l.__classPrivateFieldGet(this, r, "f")).onDeregister) || void 0 === n4 ? void 0 : n4.call(t5, e4);
              })().catch(((t5) => {
              }))), e4;
            };
            return e3 ? i3() : this.enqueue(n3, h.Del, i3);
          }
          keys() {
            return Object.keys(l.__classPrivateFieldGet(this, o, "f"));
          }
          async do(t3, e3) {
            let n3 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : l.__classPrivateFieldGet(this, r, "f").ttl, i3 = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : l.__classPrivateFieldGet(this, r, "f").mode;
            const s2 = this.serializeKey(t3);
            return this.enqueue(s2, h.Do, (async () => {
              if (l.__classPrivateFieldGet(this, o, "f")[s2]) return l.__classPrivateFieldGet(this, o, "f")[s2].value;
              const r2 = await e3();
              return await this.set(t3, r2, n3, i3, true);
            }));
          }
          async close() {
            l.__classPrivateFieldSet(this, i2, u.Closed, "f"), await Promise.all(Object.keys(l.__classPrivateFieldGet(this, o, "f")).map(((t3) => this.del(t3, true, true))));
          }
          refreshTimeout(t3, e3, n3) {
            if (l.__classPrivateFieldGet(this, i2, "f") === u.Closed) return;
            const r2 = l.__classPrivateFieldGet(this, o, "f")[e3];
            return n3 && void 0 !== (null == r2 ? void 0 : r2.timeout) && clearTimeout(r2.timeout), n3 ? (r2.timeout = setTimeout((() => this.del(t3)), n3), r2.timeout) : void 0;
          }
          clearPendingDeletesOnKey(t3, e3) {
            l.__classPrivateFieldSet(this, s, l.__classPrivateFieldGet(this, s, "f").filter(((n3) => {
              let [i3, o2, r2, s2] = n3;
              return t3 !== i3 || o2 !== h.Del || (s2.resolve(e3), false);
            })), "f");
          }
          serializeKey(t3) {
            var e3, n3, i3;
            return null !== (i3 = null === (n3 = (e3 = l.__classPrivateFieldGet(this, r, "f")).serializeKey) || void 0 === n3 ? void 0 : n3.call(e3, t3)) && void 0 !== i3 ? i3 : t3;
          }
          async enqueue(t3, e3, n3) {
            const o2 = new d.DeferredPromise();
            return l.__classPrivateFieldGet(this, s, "f").push([t3, e3, n3, o2]), l.__classPrivateFieldGet(this, i2, "f") === u.Idle && this.flush(), o2;
          }
          flush() {
            l.__classPrivateFieldSet(this, i2, u.Processing, "f"), a.nextTick((async () => {
              for (; l.__classPrivateFieldGet(this, s, "f").length && l.__classPrivateFieldGet(this, i2, "f") !== u.Closed; ) {
                const t3 = l.__classPrivateFieldGet(this, s, "f").shift();
                if (t3) {
                  const [, , e3, n3] = t3;
                  try {
                    const t4 = await e3();
                    n3.resolve(t4);
                  } catch (t4) {
                    n3.reject(t4);
                  }
                }
              }
              l.__classPrivateFieldSet(this, i2, u.Idle, "f");
            }));
          }
        }, i2 = /* @__PURE__ */ new WeakMap(), o = /* @__PURE__ */ new WeakMap(), r = /* @__PURE__ */ new WeakMap(), s = /* @__PURE__ */ new WeakMap();
      }, 3715: (t2, e2, n2) => {
        var i2 = e2;
        i2.utils = n2(6436), i2.common = n2(5772), i2.sha = n2(9041), i2.ripemd = n2(2949), i2.hmac = n2(2344), i2.sha1 = i2.sha.sha1, i2.sha256 = i2.sha.sha256, i2.sha224 = i2.sha.sha224, i2.sha384 = i2.sha.sha384, i2.sha512 = i2.sha.sha512, i2.ripemd160 = i2.ripemd.ripemd160;
      }, 5772: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(9746);
        function r() {
          this.pending = null, this.pendingTotal = 0, this.blockSize = this.constructor.blockSize, this.outSize = this.constructor.outSize, this.hmacStrength = this.constructor.hmacStrength, this.padLength = this.constructor.padLength / 8, this.endian = "big", this._delta8 = this.blockSize / 8, this._delta32 = this.blockSize / 32;
        }
        e2.BlockHash = r, r.prototype.update = function(t3, e3) {
          if (t3 = i2.toArray(t3, e3), this.pending ? this.pending = this.pending.concat(t3) : this.pending = t3, this.pendingTotal += t3.length, this.pending.length >= this._delta8) {
            var n3 = (t3 = this.pending).length % this._delta8;
            this.pending = t3.slice(t3.length - n3, t3.length), 0 === this.pending.length && (this.pending = null), t3 = i2.join32(t3, 0, t3.length - n3, this.endian);
            for (var o2 = 0; o2 < t3.length; o2 += this._delta32) this._update(t3, o2, o2 + this._delta32);
          }
          return this;
        }, r.prototype.digest = function(t3) {
          return this.update(this._pad()), o(null === this.pending), this._digest(t3);
        }, r.prototype._pad = function() {
          var t3 = this.pendingTotal, e3 = this._delta8, n3 = e3 - (t3 + this.padLength) % e3, i3 = new Array(n3 + this.padLength);
          i3[0] = 128;
          for (var o2 = 1; o2 < n3; o2++) i3[o2] = 0;
          if (t3 <<= 3, "big" === this.endian) {
            for (var r2 = 8; r2 < this.padLength; r2++) i3[o2++] = 0;
            i3[o2++] = 0, i3[o2++] = 0, i3[o2++] = 0, i3[o2++] = 0, i3[o2++] = t3 >>> 24 & 255, i3[o2++] = t3 >>> 16 & 255, i3[o2++] = t3 >>> 8 & 255, i3[o2++] = 255 & t3;
          } else for (i3[o2++] = 255 & t3, i3[o2++] = t3 >>> 8 & 255, i3[o2++] = t3 >>> 16 & 255, i3[o2++] = t3 >>> 24 & 255, i3[o2++] = 0, i3[o2++] = 0, i3[o2++] = 0, i3[o2++] = 0, r2 = 8; r2 < this.padLength; r2++) i3[o2++] = 0;
          return i3;
        };
      }, 2344: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(9746);
        function r(t3, e3, n3) {
          if (!(this instanceof r)) return new r(t3, e3, n3);
          this.Hash = t3, this.blockSize = t3.blockSize / 8, this.outSize = t3.outSize / 8, this.inner = null, this.outer = null, this._init(i2.toArray(e3, n3));
        }
        t2.exports = r, r.prototype._init = function(t3) {
          t3.length > this.blockSize && (t3 = new this.Hash().update(t3).digest()), o(t3.length <= this.blockSize);
          for (var e3 = t3.length; e3 < this.blockSize; e3++) t3.push(0);
          for (e3 = 0; e3 < t3.length; e3++) t3[e3] ^= 54;
          for (this.inner = new this.Hash().update(t3), e3 = 0; e3 < t3.length; e3++) t3[e3] ^= 106;
          this.outer = new this.Hash().update(t3);
        }, r.prototype.update = function(t3, e3) {
          return this.inner.update(t3, e3), this;
        }, r.prototype.digest = function(t3) {
          return this.outer.update(this.inner.digest()), this.outer.digest(t3);
        };
      }, 2949: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(5772), r = i2.rotl32, s = i2.sum32, a = i2.sum32_3, l = i2.sum32_4, d = o.BlockHash;
        function c() {
          if (!(this instanceof c)) return new c();
          d.call(this), this.h = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], this.endian = "little";
        }
        function u(t3, e3, n3, i3) {
          return t3 <= 15 ? e3 ^ n3 ^ i3 : t3 <= 31 ? e3 & n3 | ~e3 & i3 : t3 <= 47 ? (e3 | ~n3) ^ i3 : t3 <= 63 ? e3 & i3 | n3 & ~i3 : e3 ^ (n3 | ~i3);
        }
        function h(t3) {
          return t3 <= 15 ? 0 : t3 <= 31 ? 1518500249 : t3 <= 47 ? 1859775393 : t3 <= 63 ? 2400959708 : 2840853838;
        }
        function p(t3) {
          return t3 <= 15 ? 1352829926 : t3 <= 31 ? 1548603684 : t3 <= 47 ? 1836072691 : t3 <= 63 ? 2053994217 : 0;
        }
        i2.inherits(c, d), e2.ripemd160 = c, c.blockSize = 512, c.outSize = 160, c.hmacStrength = 192, c.padLength = 64, c.prototype._update = function(t3, e3) {
          for (var n3 = this.h[0], i3 = this.h[1], o2 = this.h[2], d2 = this.h[3], c2 = this.h[4], S = n3, I = i3, _ = o2, C = d2, O = c2, y = 0; y < 80; y++) {
            var m = s(r(l(n3, u(y, i3, o2, d2), t3[g[y] + e3], h(y)), E[y]), c2);
            n3 = c2, c2 = d2, d2 = r(o2, 10), o2 = i3, i3 = m, m = s(r(l(S, u(79 - y, I, _, C), t3[f[y] + e3], p(y)), v[y]), O), S = O, O = C, C = r(_, 10), _ = I, I = m;
          }
          m = a(this.h[1], o2, C), this.h[1] = a(this.h[2], d2, O), this.h[2] = a(this.h[3], c2, S), this.h[3] = a(this.h[4], n3, I), this.h[4] = a(this.h[0], i3, _), this.h[0] = m;
        }, c.prototype._digest = function(t3) {
          return "hex" === t3 ? i2.toHex32(this.h, "little") : i2.split32(this.h, "little");
        };
        var g = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13], f = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11], E = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6], v = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
      }, 9041: (t2, e2, n2) => {
        "use strict";
        e2.sha1 = n2(4761), e2.sha224 = n2(799), e2.sha256 = n2(9344), e2.sha384 = n2(772), e2.sha512 = n2(5900);
      }, 4761: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(5772), r = n2(7038), s = i2.rotl32, a = i2.sum32, l = i2.sum32_5, d = r.ft_1, c = o.BlockHash, u = [1518500249, 1859775393, 2400959708, 3395469782];
        function h() {
          if (!(this instanceof h)) return new h();
          c.call(this), this.h = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], this.W = new Array(80);
        }
        i2.inherits(h, c), t2.exports = h, h.blockSize = 512, h.outSize = 160, h.hmacStrength = 80, h.padLength = 64, h.prototype._update = function(t3, e3) {
          for (var n3 = this.W, i3 = 0; i3 < 16; i3++) n3[i3] = t3[e3 + i3];
          for (; i3 < n3.length; i3++) n3[i3] = s(n3[i3 - 3] ^ n3[i3 - 8] ^ n3[i3 - 14] ^ n3[i3 - 16], 1);
          var o2 = this.h[0], r2 = this.h[1], c2 = this.h[2], h2 = this.h[3], p = this.h[4];
          for (i3 = 0; i3 < n3.length; i3++) {
            var g = ~~(i3 / 20), f = l(s(o2, 5), d(g, r2, c2, h2), p, n3[i3], u[g]);
            p = h2, h2 = c2, c2 = s(r2, 30), r2 = o2, o2 = f;
          }
          this.h[0] = a(this.h[0], o2), this.h[1] = a(this.h[1], r2), this.h[2] = a(this.h[2], c2), this.h[3] = a(this.h[3], h2), this.h[4] = a(this.h[4], p);
        }, h.prototype._digest = function(t3) {
          return "hex" === t3 ? i2.toHex32(this.h, "big") : i2.split32(this.h, "big");
        };
      }, 799: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(9344);
        function r() {
          if (!(this instanceof r)) return new r();
          o.call(this), this.h = [3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428];
        }
        i2.inherits(r, o), t2.exports = r, r.blockSize = 512, r.outSize = 224, r.hmacStrength = 192, r.padLength = 64, r.prototype._digest = function(t3) {
          return "hex" === t3 ? i2.toHex32(this.h.slice(0, 7), "big") : i2.split32(this.h.slice(0, 7), "big");
        };
      }, 9344: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(5772), r = n2(7038), s = n2(9746), a = i2.sum32, l = i2.sum32_4, d = i2.sum32_5, c = r.ch32, u = r.maj32, h = r.s0_256, p = r.s1_256, g = r.g0_256, f = r.g1_256, E = o.BlockHash, v = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
        function S() {
          if (!(this instanceof S)) return new S();
          E.call(this), this.h = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225], this.k = v, this.W = new Array(64);
        }
        i2.inherits(S, E), t2.exports = S, S.blockSize = 512, S.outSize = 256, S.hmacStrength = 192, S.padLength = 64, S.prototype._update = function(t3, e3) {
          for (var n3 = this.W, i3 = 0; i3 < 16; i3++) n3[i3] = t3[e3 + i3];
          for (; i3 < n3.length; i3++) n3[i3] = l(f(n3[i3 - 2]), n3[i3 - 7], g(n3[i3 - 15]), n3[i3 - 16]);
          var o2 = this.h[0], r2 = this.h[1], E2 = this.h[2], v2 = this.h[3], S2 = this.h[4], I = this.h[5], _ = this.h[6], C = this.h[7];
          for (s(this.k.length === n3.length), i3 = 0; i3 < n3.length; i3++) {
            var O = d(C, p(S2), c(S2, I, _), this.k[i3], n3[i3]), y = a(h(o2), u(o2, r2, E2));
            C = _, _ = I, I = S2, S2 = a(v2, O), v2 = E2, E2 = r2, r2 = o2, o2 = a(O, y);
          }
          this.h[0] = a(this.h[0], o2), this.h[1] = a(this.h[1], r2), this.h[2] = a(this.h[2], E2), this.h[3] = a(this.h[3], v2), this.h[4] = a(this.h[4], S2), this.h[5] = a(this.h[5], I), this.h[6] = a(this.h[6], _), this.h[7] = a(this.h[7], C);
        }, S.prototype._digest = function(t3) {
          return "hex" === t3 ? i2.toHex32(this.h, "big") : i2.split32(this.h, "big");
        };
      }, 772: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(5900);
        function r() {
          if (!(this instanceof r)) return new r();
          o.call(this), this.h = [3418070365, 3238371032, 1654270250, 914150663, 2438529370, 812702999, 355462360, 4144912697, 1731405415, 4290775857, 2394180231, 1750603025, 3675008525, 1694076839, 1203062813, 3204075428];
        }
        i2.inherits(r, o), t2.exports = r, r.blockSize = 1024, r.outSize = 384, r.hmacStrength = 192, r.padLength = 128, r.prototype._digest = function(t3) {
          return "hex" === t3 ? i2.toHex32(this.h.slice(0, 12), "big") : i2.split32(this.h.slice(0, 12), "big");
        };
      }, 5900: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436), o = n2(5772), r = n2(9746), s = i2.rotr64_hi, a = i2.rotr64_lo, l = i2.shr64_hi, d = i2.shr64_lo, c = i2.sum64, u = i2.sum64_hi, h = i2.sum64_lo, p = i2.sum64_4_hi, g = i2.sum64_4_lo, f = i2.sum64_5_hi, E = i2.sum64_5_lo, v = o.BlockHash, S = [1116352408, 3609767458, 1899447441, 602891725, 3049323471, 3964484399, 3921009573, 2173295548, 961987163, 4081628472, 1508970993, 3053834265, 2453635748, 2937671579, 2870763221, 3664609560, 3624381080, 2734883394, 310598401, 1164996542, 607225278, 1323610764, 1426881987, 3590304994, 1925078388, 4068182383, 2162078206, 991336113, 2614888103, 633803317, 3248222580, 3479774868, 3835390401, 2666613458, 4022224774, 944711139, 264347078, 2341262773, 604807628, 2007800933, 770255983, 1495990901, 1249150122, 1856431235, 1555081692, 3175218132, 1996064986, 2198950837, 2554220882, 3999719339, 2821834349, 766784016, 2952996808, 2566594879, 3210313671, 3203337956, 3336571891, 1034457026, 3584528711, 2466948901, 113926993, 3758326383, 338241895, 168717936, 666307205, 1188179964, 773529912, 1546045734, 1294757372, 1522805485, 1396182291, 2643833823, 1695183700, 2343527390, 1986661051, 1014477480, 2177026350, 1206759142, 2456956037, 344077627, 2730485921, 1290863460, 2820302411, 3158454273, 3259730800, 3505952657, 3345764771, 106217008, 3516065817, 3606008344, 3600352804, 1432725776, 4094571909, 1467031594, 275423344, 851169720, 430227734, 3100823752, 506948616, 1363258195, 659060556, 3750685593, 883997877, 3785050280, 958139571, 3318307427, 1322822218, 3812723403, 1537002063, 2003034995, 1747873779, 3602036899, 1955562222, 1575990012, 2024104815, 1125592928, 2227730452, 2716904306, 2361852424, 442776044, 2428436474, 593698344, 2756734187, 3733110249, 3204031479, 2999351573, 3329325298, 3815920427, 3391569614, 3928383900, 3515267271, 566280711, 3940187606, 3454069534, 4118630271, 4000239992, 116418474, 1914138554, 174292421, 2731055270, 289380356, 3203993006, 460393269, 320620315, 685471733, 587496836, 852142971, 1086792851, 1017036298, 365543100, 1126000580, 2618297676, 1288033470, 3409855158, 1501505948, 4234509866, 1607167915, 987167468, 1816402316, 1246189591];
        function I() {
          if (!(this instanceof I)) return new I();
          v.call(this), this.h = [1779033703, 4089235720, 3144134277, 2227873595, 1013904242, 4271175723, 2773480762, 1595750129, 1359893119, 2917565137, 2600822924, 725511199, 528734635, 4215389547, 1541459225, 327033209], this.k = S, this.W = new Array(160);
        }
        function _(t3, e3, n3, i3, o2) {
          var r2 = t3 & n3 ^ ~t3 & o2;
          return r2 < 0 && (r2 += 4294967296), r2;
        }
        function C(t3, e3, n3, i3, o2, r2) {
          var s2 = e3 & i3 ^ ~e3 & r2;
          return s2 < 0 && (s2 += 4294967296), s2;
        }
        function O(t3, e3, n3, i3, o2) {
          var r2 = t3 & n3 ^ t3 & o2 ^ n3 & o2;
          return r2 < 0 && (r2 += 4294967296), r2;
        }
        function y(t3, e3, n3, i3, o2, r2) {
          var s2 = e3 & i3 ^ e3 & r2 ^ i3 & r2;
          return s2 < 0 && (s2 += 4294967296), s2;
        }
        function m(t3, e3) {
          var n3 = s(t3, e3, 28) ^ s(e3, t3, 2) ^ s(e3, t3, 7);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function w(t3, e3) {
          var n3 = a(t3, e3, 28) ^ a(e3, t3, 2) ^ a(e3, t3, 7);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function A(t3, e3) {
          var n3 = s(t3, e3, 14) ^ s(t3, e3, 18) ^ s(e3, t3, 9);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function T(t3, e3) {
          var n3 = a(t3, e3, 14) ^ a(t3, e3, 18) ^ a(e3, t3, 9);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function N(t3, e3) {
          var n3 = s(t3, e3, 1) ^ s(t3, e3, 8) ^ l(t3, e3, 7);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function P(t3, e3) {
          var n3 = a(t3, e3, 1) ^ a(t3, e3, 8) ^ d(t3, e3, 7);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function b(t3, e3) {
          var n3 = s(t3, e3, 19) ^ s(e3, t3, 29) ^ l(t3, e3, 6);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        function D(t3, e3) {
          var n3 = a(t3, e3, 19) ^ a(e3, t3, 29) ^ d(t3, e3, 6);
          return n3 < 0 && (n3 += 4294967296), n3;
        }
        i2.inherits(I, v), t2.exports = I, I.blockSize = 1024, I.outSize = 512, I.hmacStrength = 192, I.padLength = 128, I.prototype._prepareBlock = function(t3, e3) {
          for (var n3 = this.W, i3 = 0; i3 < 32; i3++) n3[i3] = t3[e3 + i3];
          for (; i3 < n3.length; i3 += 2) {
            var o2 = b(n3[i3 - 4], n3[i3 - 3]), r2 = D(n3[i3 - 4], n3[i3 - 3]), s2 = n3[i3 - 14], a2 = n3[i3 - 13], l2 = N(n3[i3 - 30], n3[i3 - 29]), d2 = P(n3[i3 - 30], n3[i3 - 29]), c2 = n3[i3 - 32], u2 = n3[i3 - 31];
            n3[i3] = p(o2, r2, s2, a2, l2, d2, c2, u2), n3[i3 + 1] = g(o2, r2, s2, a2, l2, d2, c2, u2);
          }
        }, I.prototype._update = function(t3, e3) {
          this._prepareBlock(t3, e3);
          var n3 = this.W, i3 = this.h[0], o2 = this.h[1], s2 = this.h[2], a2 = this.h[3], l2 = this.h[4], d2 = this.h[5], p2 = this.h[6], g2 = this.h[7], v2 = this.h[8], S2 = this.h[9], I2 = this.h[10], N2 = this.h[11], P2 = this.h[12], b2 = this.h[13], D2 = this.h[14], R = this.h[15];
          r(this.k.length === n3.length);
          for (var L = 0; L < n3.length; L += 2) {
            var k = D2, U = R, M = A(v2, S2), F = T(v2, S2), j = _(v2, S2, I2, N2, P2), B = C(v2, S2, I2, N2, P2, b2), x = this.k[L], $ = this.k[L + 1], H = n3[L], K = n3[L + 1], V = f(k, U, M, F, j, B, x, $, H, K), W = E(k, U, M, F, j, B, x, $, H, K);
            k = m(i3, o2), U = w(i3, o2), M = O(i3, o2, s2, a2, l2), F = y(i3, o2, s2, a2, l2, d2);
            var G = u(k, U, M, F), q = h(k, U, M, F);
            D2 = P2, R = b2, P2 = I2, b2 = N2, I2 = v2, N2 = S2, v2 = u(p2, g2, V, W), S2 = h(g2, g2, V, W), p2 = l2, g2 = d2, l2 = s2, d2 = a2, s2 = i3, a2 = o2, i3 = u(V, W, G, q), o2 = h(V, W, G, q);
          }
          c(this.h, 0, i3, o2), c(this.h, 2, s2, a2), c(this.h, 4, l2, d2), c(this.h, 6, p2, g2), c(this.h, 8, v2, S2), c(this.h, 10, I2, N2), c(this.h, 12, P2, b2), c(this.h, 14, D2, R);
        }, I.prototype._digest = function(t3) {
          return "hex" === t3 ? i2.toHex32(this.h, "big") : i2.split32(this.h, "big");
        };
      }, 7038: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(6436).rotr32;
        function o(t3, e3, n3) {
          return t3 & e3 ^ ~t3 & n3;
        }
        function r(t3, e3, n3) {
          return t3 & e3 ^ t3 & n3 ^ e3 & n3;
        }
        function s(t3, e3, n3) {
          return t3 ^ e3 ^ n3;
        }
        e2.ft_1 = function(t3, e3, n3, i3) {
          return 0 === t3 ? o(e3, n3, i3) : 1 === t3 || 3 === t3 ? s(e3, n3, i3) : 2 === t3 ? r(e3, n3, i3) : void 0;
        }, e2.ch32 = o, e2.maj32 = r, e2.p32 = s, e2.s0_256 = function(t3) {
          return i2(t3, 2) ^ i2(t3, 13) ^ i2(t3, 22);
        }, e2.s1_256 = function(t3) {
          return i2(t3, 6) ^ i2(t3, 11) ^ i2(t3, 25);
        }, e2.g0_256 = function(t3) {
          return i2(t3, 7) ^ i2(t3, 18) ^ t3 >>> 3;
        }, e2.g1_256 = function(t3) {
          return i2(t3, 17) ^ i2(t3, 19) ^ t3 >>> 10;
        };
      }, 6436: (t2, e2, n2) => {
        "use strict";
        var i2 = n2(9746), o = n2(5717);
        function r(t3, e3) {
          return 55296 == (64512 & t3.charCodeAt(e3)) && (!(e3 < 0 || e3 + 1 >= t3.length) && 56320 == (64512 & t3.charCodeAt(e3 + 1)));
        }
        function s(t3) {
          return (t3 >>> 24 | t3 >>> 8 & 65280 | t3 << 8 & 16711680 | (255 & t3) << 24) >>> 0;
        }
        function a(t3) {
          return 1 === t3.length ? "0" + t3 : t3;
        }
        function l(t3) {
          return 7 === t3.length ? "0" + t3 : 6 === t3.length ? "00" + t3 : 5 === t3.length ? "000" + t3 : 4 === t3.length ? "0000" + t3 : 3 === t3.length ? "00000" + t3 : 2 === t3.length ? "000000" + t3 : 1 === t3.length ? "0000000" + t3 : t3;
        }
        e2.inherits = o, e2.toArray = function(t3, e3) {
          if (Array.isArray(t3)) return t3.slice();
          if (!t3) return [];
          var n3 = [];
          if ("string" == typeof t3) if (e3) {
            if ("hex" === e3) for ((t3 = t3.replace(/[^a-z0-9]+/gi, "")).length % 2 != 0 && (t3 = "0" + t3), o2 = 0; o2 < t3.length; o2 += 2) n3.push(parseInt(t3[o2] + t3[o2 + 1], 16));
          } else for (var i3 = 0, o2 = 0; o2 < t3.length; o2++) {
            var s2 = t3.charCodeAt(o2);
            s2 < 128 ? n3[i3++] = s2 : s2 < 2048 ? (n3[i3++] = s2 >> 6 | 192, n3[i3++] = 63 & s2 | 128) : r(t3, o2) ? (s2 = 65536 + ((1023 & s2) << 10) + (1023 & t3.charCodeAt(++o2)), n3[i3++] = s2 >> 18 | 240, n3[i3++] = s2 >> 12 & 63 | 128, n3[i3++] = s2 >> 6 & 63 | 128, n3[i3++] = 63 & s2 | 128) : (n3[i3++] = s2 >> 12 | 224, n3[i3++] = s2 >> 6 & 63 | 128, n3[i3++] = 63 & s2 | 128);
          }
          else for (o2 = 0; o2 < t3.length; o2++) n3[o2] = 0 | t3[o2];
          return n3;
        }, e2.toHex = function(t3) {
          for (var e3 = "", n3 = 0; n3 < t3.length; n3++) e3 += a(t3[n3].toString(16));
          return e3;
        }, e2.htonl = s, e2.toHex32 = function(t3, e3) {
          for (var n3 = "", i3 = 0; i3 < t3.length; i3++) {
            var o2 = t3[i3];
            "little" === e3 && (o2 = s(o2)), n3 += l(o2.toString(16));
          }
          return n3;
        }, e2.zero2 = a, e2.zero8 = l, e2.join32 = function(t3, e3, n3, o2) {
          var r2 = n3 - e3;
          i2(r2 % 4 == 0);
          for (var s2 = new Array(r2 / 4), a2 = 0, l2 = e3; a2 < s2.length; a2++, l2 += 4) {
            var d;
            d = "big" === o2 ? t3[l2] << 24 | t3[l2 + 1] << 16 | t3[l2 + 2] << 8 | t3[l2 + 3] : t3[l2 + 3] << 24 | t3[l2 + 2] << 16 | t3[l2 + 1] << 8 | t3[l2], s2[a2] = d >>> 0;
          }
          return s2;
        }, e2.split32 = function(t3, e3) {
          for (var n3 = new Array(4 * t3.length), i3 = 0, o2 = 0; i3 < t3.length; i3++, o2 += 4) {
            var r2 = t3[i3];
            "big" === e3 ? (n3[o2] = r2 >>> 24, n3[o2 + 1] = r2 >>> 16 & 255, n3[o2 + 2] = r2 >>> 8 & 255, n3[o2 + 3] = 255 & r2) : (n3[o2 + 3] = r2 >>> 24, n3[o2 + 2] = r2 >>> 16 & 255, n3[o2 + 1] = r2 >>> 8 & 255, n3[o2] = 255 & r2);
          }
          return n3;
        }, e2.rotr32 = function(t3, e3) {
          return t3 >>> e3 | t3 << 32 - e3;
        }, e2.rotl32 = function(t3, e3) {
          return t3 << e3 | t3 >>> 32 - e3;
        }, e2.sum32 = function(t3, e3) {
          return t3 + e3 >>> 0;
        }, e2.sum32_3 = function(t3, e3, n3) {
          return t3 + e3 + n3 >>> 0;
        }, e2.sum32_4 = function(t3, e3, n3, i3) {
          return t3 + e3 + n3 + i3 >>> 0;
        }, e2.sum32_5 = function(t3, e3, n3, i3, o2) {
          return t3 + e3 + n3 + i3 + o2 >>> 0;
        }, e2.sum64 = function(t3, e3, n3, i3) {
          var o2 = t3[e3], r2 = i3 + t3[e3 + 1] >>> 0, s2 = (r2 < i3 ? 1 : 0) + n3 + o2;
          t3[e3] = s2 >>> 0, t3[e3 + 1] = r2;
        }, e2.sum64_hi = function(t3, e3, n3, i3) {
          return (e3 + i3 >>> 0 < e3 ? 1 : 0) + t3 + n3 >>> 0;
        }, e2.sum64_lo = function(t3, e3, n3, i3) {
          return e3 + i3 >>> 0;
        }, e2.sum64_4_hi = function(t3, e3, n3, i3, o2, r2, s2, a2) {
          var l2 = 0, d = e3;
          return l2 += (d = d + i3 >>> 0) < e3 ? 1 : 0, l2 += (d = d + r2 >>> 0) < r2 ? 1 : 0, t3 + n3 + o2 + s2 + (l2 += (d = d + a2 >>> 0) < a2 ? 1 : 0) >>> 0;
        }, e2.sum64_4_lo = function(t3, e3, n3, i3, o2, r2, s2, a2) {
          return e3 + i3 + r2 + a2 >>> 0;
        }, e2.sum64_5_hi = function(t3, e3, n3, i3, o2, r2, s2, a2, l2, d) {
          var c = 0, u = e3;
          return c += (u = u + i3 >>> 0) < e3 ? 1 : 0, c += (u = u + r2 >>> 0) < r2 ? 1 : 0, c += (u = u + a2 >>> 0) < a2 ? 1 : 0, t3 + n3 + o2 + s2 + l2 + (c += (u = u + d >>> 0) < d ? 1 : 0) >>> 0;
        }, e2.sum64_5_lo = function(t3, e3, n3, i3, o2, r2, s2, a2, l2, d) {
          return e3 + i3 + r2 + a2 + d >>> 0;
        }, e2.rotr64_hi = function(t3, e3, n3) {
          return (e3 << 32 - n3 | t3 >>> n3) >>> 0;
        }, e2.rotr64_lo = function(t3, e3, n3) {
          return (t3 << 32 - n3 | e3 >>> n3) >>> 0;
        }, e2.shr64_hi = function(t3, e3, n3) {
          return t3 >>> n3;
        }, e2.shr64_lo = function(t3, e3, n3) {
          return (t3 << 32 - n3 | e3 >>> n3) >>> 0;
        };
      }, 5717: (t2) => {
        "function" == typeof Object.create ? t2.exports = function(t3, e2) {
          e2 && (t3.super_ = e2, t3.prototype = Object.create(e2.prototype, { constructor: { value: t3, enumerable: false, writable: true, configurable: true } }));
        } : t2.exports = function(t3, e2) {
          if (e2) {
            t3.super_ = e2;
            var n2 = function() {
            };
            n2.prototype = e2.prototype, t3.prototype = new n2(), t3.prototype.constructor = t3;
          }
        };
      }, 6245: (t2, e2, n2) => {
        "use strict";
        function i2(t3) {
          this.message = t3;
        }
        n2.r(e2), n2.d(e2, { InvalidTokenError: () => s, default: () => a }), i2.prototype = new Error(), i2.prototype.name = "InvalidCharacterError";
        var o = "undefined" != typeof window && window.atob && window.atob.bind(window) || function(t3) {
          var e3 = String(t3).replace(/=+$/, "");
          if (e3.length % 4 == 1) throw new i2("'atob' failed: The string to be decoded is not correctly encoded.");
          for (var n3, o2, r2 = 0, s2 = 0, a2 = ""; o2 = e3.charAt(s2++); ~o2 && (n3 = r2 % 4 ? 64 * n3 + o2 : o2, r2++ % 4) ? a2 += String.fromCharCode(255 & n3 >> (-2 * r2 & 6)) : 0) o2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(o2);
          return a2;
        };
        function r(t3) {
          var e3 = t3.replace(/-/g, "+").replace(/_/g, "/");
          switch (e3.length % 4) {
            case 0:
              break;
            case 2:
              e3 += "==";
              break;
            case 3:
              e3 += "=";
              break;
            default:
              throw "Illegal base64url string!";
          }
          try {
            return (function(t4) {
              return decodeURIComponent(o(t4).replace(/(.)/g, (function(t5, e4) {
                var n3 = e4.charCodeAt(0).toString(16).toUpperCase();
                return n3.length < 2 && (n3 = "0" + n3), "%" + n3;
              })));
            })(e3);
          } catch (t4) {
            return o(e3);
          }
        }
        function s(t3) {
          this.message = t3;
        }
        s.prototype = new Error(), s.prototype.name = "InvalidTokenError";
        const a = function(t3, e3) {
          if ("string" != typeof t3) throw new s("Invalid token specified");
          var n3 = true === (e3 = e3 || {}).header ? 0 : 1;
          try {
            return JSON.parse(r(t3.split(".")[n3]));
          } catch (t4) {
            throw new s("Invalid token specified: " + t4.message);
          }
        };
      }, 9746: (t2) => {
        function e2(t3, e3) {
          if (!t3) throw new Error(e3 || "Assertion failed");
        }
        t2.exports = e2, e2.equal = function(t3, e3, n2) {
          if (t3 != e3) throw new Error(n2 || "Assertion failed: " + t3 + " != " + e3);
        };
      }, 4155: (t2) => {
        var e2, n2, i2 = t2.exports = {};
        function o() {
          throw new Error("setTimeout has not been defined");
        }
        function r() {
          throw new Error("clearTimeout has not been defined");
        }
        function s(t3) {
          if (e2 === setTimeout) return setTimeout(t3, 0);
          if ((e2 === o || !e2) && setTimeout) return e2 = setTimeout, setTimeout(t3, 0);
          try {
            return e2(t3, 0);
          } catch (n3) {
            try {
              return e2.call(null, t3, 0);
            } catch (n4) {
              return e2.call(this, t3, 0);
            }
          }
        }
        !(function() {
          try {
            e2 = "function" == typeof setTimeout ? setTimeout : o;
          } catch (t3) {
            e2 = o;
          }
          try {
            n2 = "function" == typeof clearTimeout ? clearTimeout : r;
          } catch (t3) {
            n2 = r;
          }
        })();
        var a, l = [], d = false, c = -1;
        function u() {
          d && a && (d = false, a.length ? l = a.concat(l) : c = -1, l.length && h());
        }
        function h() {
          if (!d) {
            var t3 = s(u);
            d = true;
            for (var e3 = l.length; e3; ) {
              for (a = l, l = []; ++c < e3; ) a && a[c].run();
              c = -1, e3 = l.length;
            }
            a = null, d = false, (function(t4) {
              if (n2 === clearTimeout) return clearTimeout(t4);
              if ((n2 === r || !n2) && clearTimeout) return n2 = clearTimeout, clearTimeout(t4);
              try {
                return n2(t4);
              } catch (e4) {
                try {
                  return n2.call(null, t4);
                } catch (e5) {
                  return n2.call(this, t4);
                }
              }
            })(t3);
          }
        }
        function p(t3, e3) {
          this.fun = t3, this.array = e3;
        }
        function g() {
        }
        i2.nextTick = function(t3) {
          var e3 = new Array(arguments.length - 1);
          if (arguments.length > 1) for (var n3 = 1; n3 < arguments.length; n3++) e3[n3 - 1] = arguments[n3];
          l.push(new p(t3, e3)), 1 !== l.length || d || s(h);
        }, p.prototype.run = function() {
          this.fun.apply(null, this.array);
        }, i2.title = "browser", i2.browser = true, i2.env = {}, i2.argv = [], i2.version = "", i2.versions = {}, i2.on = g, i2.addListener = g, i2.once = g, i2.off = g, i2.removeListener = g, i2.removeAllListeners = g, i2.emit = g, i2.prependListener = g, i2.prependOnceListener = g, i2.listeners = function(t3) {
          return [];
        }, i2.binding = function(t3) {
          throw new Error("process.binding is not supported");
        }, i2.cwd = function() {
          return "/";
        }, i2.chdir = function(t3) {
          throw new Error("process.chdir is not supported");
        }, i2.umask = function() {
          return 0;
        };
      }, 655: (t2, e2, n2) => {
        "use strict";
        n2.r(e2), n2.d(e2, { __assign: () => r, __asyncDelegator: () => C, __asyncGenerator: () => _, __asyncValues: () => O, __await: () => I, __awaiter: () => c, __classPrivateFieldGet: () => T, __classPrivateFieldSet: () => N, __createBinding: () => h, __decorate: () => a, __exportStar: () => p, __extends: () => o, __generator: () => u, __importDefault: () => A, __importStar: () => w, __makeTemplateObject: () => y, __metadata: () => d, __param: () => l, __read: () => f, __rest: () => s, __spread: () => E, __spreadArray: () => S, __spreadArrays: () => v, __values: () => g });
        var i2 = function(t3, e3) {
          return i2 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(t4, e4) {
            t4.__proto__ = e4;
          } || function(t4, e4) {
            for (var n3 in e4) Object.prototype.hasOwnProperty.call(e4, n3) && (t4[n3] = e4[n3]);
          }, i2(t3, e3);
        };
        function o(t3, e3) {
          if ("function" != typeof e3 && null !== e3) throw new TypeError("Class extends value " + String(e3) + " is not a constructor or null");
          function n3() {
            this.constructor = t3;
          }
          i2(t3, e3), t3.prototype = null === e3 ? Object.create(e3) : (n3.prototype = e3.prototype, new n3());
        }
        var r = function() {
          return r = Object.assign || function(t3) {
            for (var e3, n3 = 1, i3 = arguments.length; n3 < i3; n3++) for (var o2 in e3 = arguments[n3]) Object.prototype.hasOwnProperty.call(e3, o2) && (t3[o2] = e3[o2]);
            return t3;
          }, r.apply(this, arguments);
        };
        function s(t3, e3) {
          var n3 = {};
          for (var i3 in t3) Object.prototype.hasOwnProperty.call(t3, i3) && e3.indexOf(i3) < 0 && (n3[i3] = t3[i3]);
          if (null != t3 && "function" == typeof Object.getOwnPropertySymbols) {
            var o2 = 0;
            for (i3 = Object.getOwnPropertySymbols(t3); o2 < i3.length; o2++) e3.indexOf(i3[o2]) < 0 && Object.prototype.propertyIsEnumerable.call(t3, i3[o2]) && (n3[i3[o2]] = t3[i3[o2]]);
          }
          return n3;
        }
        function a(t3, e3, n3, i3) {
          var o2, r2 = arguments.length, s2 = r2 < 3 ? e3 : null === i3 ? i3 = Object.getOwnPropertyDescriptor(e3, n3) : i3;
          if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) s2 = Reflect.decorate(t3, e3, n3, i3);
          else for (var a2 = t3.length - 1; a2 >= 0; a2--) (o2 = t3[a2]) && (s2 = (r2 < 3 ? o2(s2) : r2 > 3 ? o2(e3, n3, s2) : o2(e3, n3)) || s2);
          return r2 > 3 && s2 && Object.defineProperty(e3, n3, s2), s2;
        }
        function l(t3, e3) {
          return function(n3, i3) {
            e3(n3, i3, t3);
          };
        }
        function d(t3, e3) {
          if ("object" == typeof Reflect && "function" == typeof Reflect.metadata) return Reflect.metadata(t3, e3);
        }
        function c(t3, e3, n3, i3) {
          return new (n3 || (n3 = Promise))((function(o2, r2) {
            function s2(t4) {
              try {
                l2(i3.next(t4));
              } catch (t5) {
                r2(t5);
              }
            }
            function a2(t4) {
              try {
                l2(i3.throw(t4));
              } catch (t5) {
                r2(t5);
              }
            }
            function l2(t4) {
              var e4;
              t4.done ? o2(t4.value) : (e4 = t4.value, e4 instanceof n3 ? e4 : new n3((function(t5) {
                t5(e4);
              }))).then(s2, a2);
            }
            l2((i3 = i3.apply(t3, e3 || [])).next());
          }));
        }
        function u(t3, e3) {
          var n3, i3, o2, r2, s2 = { label: 0, sent: function() {
            if (1 & o2[0]) throw o2[1];
            return o2[1];
          }, trys: [], ops: [] };
          return r2 = { next: a2(0), throw: a2(1), return: a2(2) }, "function" == typeof Symbol && (r2[Symbol.iterator] = function() {
            return this;
          }), r2;
          function a2(r3) {
            return function(a3) {
              return (function(r4) {
                if (n3) throw new TypeError("Generator is already executing.");
                for (; s2; ) try {
                  if (n3 = 1, i3 && (o2 = 2 & r4[0] ? i3.return : r4[0] ? i3.throw || ((o2 = i3.return) && o2.call(i3), 0) : i3.next) && !(o2 = o2.call(i3, r4[1])).done) return o2;
                  switch (i3 = 0, o2 && (r4 = [2 & r4[0], o2.value]), r4[0]) {
                    case 0:
                    case 1:
                      o2 = r4;
                      break;
                    case 4:
                      return s2.label++, { value: r4[1], done: false };
                    case 5:
                      s2.label++, i3 = r4[1], r4 = [0];
                      continue;
                    case 7:
                      r4 = s2.ops.pop(), s2.trys.pop();
                      continue;
                    default:
                      if (!(o2 = s2.trys, (o2 = o2.length > 0 && o2[o2.length - 1]) || 6 !== r4[0] && 2 !== r4[0])) {
                        s2 = 0;
                        continue;
                      }
                      if (3 === r4[0] && (!o2 || r4[1] > o2[0] && r4[1] < o2[3])) {
                        s2.label = r4[1];
                        break;
                      }
                      if (6 === r4[0] && s2.label < o2[1]) {
                        s2.label = o2[1], o2 = r4;
                        break;
                      }
                      if (o2 && s2.label < o2[2]) {
                        s2.label = o2[2], s2.ops.push(r4);
                        break;
                      }
                      o2[2] && s2.ops.pop(), s2.trys.pop();
                      continue;
                  }
                  r4 = e3.call(t3, s2);
                } catch (t4) {
                  r4 = [6, t4], i3 = 0;
                } finally {
                  n3 = o2 = 0;
                }
                if (5 & r4[0]) throw r4[1];
                return { value: r4[0] ? r4[1] : void 0, done: true };
              })([r3, a3]);
            };
          }
        }
        var h = Object.create ? function(t3, e3, n3, i3) {
          void 0 === i3 && (i3 = n3), Object.defineProperty(t3, i3, { enumerable: true, get: function() {
            return e3[n3];
          } });
        } : function(t3, e3, n3, i3) {
          void 0 === i3 && (i3 = n3), t3[i3] = e3[n3];
        };
        function p(t3, e3) {
          for (var n3 in t3) "default" === n3 || Object.prototype.hasOwnProperty.call(e3, n3) || h(e3, t3, n3);
        }
        function g(t3) {
          var e3 = "function" == typeof Symbol && Symbol.iterator, n3 = e3 && t3[e3], i3 = 0;
          if (n3) return n3.call(t3);
          if (t3 && "number" == typeof t3.length) return { next: function() {
            return t3 && i3 >= t3.length && (t3 = void 0), { value: t3 && t3[i3++], done: !t3 };
          } };
          throw new TypeError(e3 ? "Object is not iterable." : "Symbol.iterator is not defined.");
        }
        function f(t3, e3) {
          var n3 = "function" == typeof Symbol && t3[Symbol.iterator];
          if (!n3) return t3;
          var i3, o2, r2 = n3.call(t3), s2 = [];
          try {
            for (; (void 0 === e3 || e3-- > 0) && !(i3 = r2.next()).done; ) s2.push(i3.value);
          } catch (t4) {
            o2 = { error: t4 };
          } finally {
            try {
              i3 && !i3.done && (n3 = r2.return) && n3.call(r2);
            } finally {
              if (o2) throw o2.error;
            }
          }
          return s2;
        }
        function E() {
          for (var t3 = [], e3 = 0; e3 < arguments.length; e3++) t3 = t3.concat(f(arguments[e3]));
          return t3;
        }
        function v() {
          for (var t3 = 0, e3 = 0, n3 = arguments.length; e3 < n3; e3++) t3 += arguments[e3].length;
          var i3 = Array(t3), o2 = 0;
          for (e3 = 0; e3 < n3; e3++) for (var r2 = arguments[e3], s2 = 0, a2 = r2.length; s2 < a2; s2++, o2++) i3[o2] = r2[s2];
          return i3;
        }
        function S(t3, e3, n3) {
          if (n3 || 2 === arguments.length) for (var i3, o2 = 0, r2 = e3.length; o2 < r2; o2++) !i3 && o2 in e3 || (i3 || (i3 = Array.prototype.slice.call(e3, 0, o2)), i3[o2] = e3[o2]);
          return t3.concat(i3 || Array.prototype.slice.call(e3));
        }
        function I(t3) {
          return this instanceof I ? (this.v = t3, this) : new I(t3);
        }
        function _(t3, e3, n3) {
          if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
          var i3, o2 = n3.apply(t3, e3 || []), r2 = [];
          return i3 = {}, s2("next"), s2("throw"), s2("return"), i3[Symbol.asyncIterator] = function() {
            return this;
          }, i3;
          function s2(t4) {
            o2[t4] && (i3[t4] = function(e4) {
              return new Promise((function(n4, i4) {
                r2.push([t4, e4, n4, i4]) > 1 || a2(t4, e4);
              }));
            });
          }
          function a2(t4, e4) {
            try {
              (n4 = o2[t4](e4)).value instanceof I ? Promise.resolve(n4.value.v).then(l2, d2) : c2(r2[0][2], n4);
            } catch (t5) {
              c2(r2[0][3], t5);
            }
            var n4;
          }
          function l2(t4) {
            a2("next", t4);
          }
          function d2(t4) {
            a2("throw", t4);
          }
          function c2(t4, e4) {
            t4(e4), r2.shift(), r2.length && a2(r2[0][0], r2[0][1]);
          }
        }
        function C(t3) {
          var e3, n3;
          return e3 = {}, i3("next"), i3("throw", (function(t4) {
            throw t4;
          })), i3("return"), e3[Symbol.iterator] = function() {
            return this;
          }, e3;
          function i3(i4, o2) {
            e3[i4] = t3[i4] ? function(e4) {
              return (n3 = !n3) ? { value: I(t3[i4](e4)), done: "return" === i4 } : o2 ? o2(e4) : e4;
            } : o2;
          }
        }
        function O(t3) {
          if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
          var e3, n3 = t3[Symbol.asyncIterator];
          return n3 ? n3.call(t3) : (t3 = g(t3), e3 = {}, i3("next"), i3("throw"), i3("return"), e3[Symbol.asyncIterator] = function() {
            return this;
          }, e3);
          function i3(n4) {
            e3[n4] = t3[n4] && function(e4) {
              return new Promise((function(i4, o2) {
                (function(t4, e5, n5, i5) {
                  Promise.resolve(i5).then((function(e6) {
                    t4({ value: e6, done: n5 });
                  }), e5);
                })(i4, o2, (e4 = t3[n4](e4)).done, e4.value);
              }));
            };
          }
        }
        function y(t3, e3) {
          return Object.defineProperty ? Object.defineProperty(t3, "raw", { value: e3 }) : t3.raw = e3, t3;
        }
        var m = Object.create ? function(t3, e3) {
          Object.defineProperty(t3, "default", { enumerable: true, value: e3 });
        } : function(t3, e3) {
          t3.default = e3;
        };
        function w(t3) {
          if (t3 && t3.__esModule) return t3;
          var e3 = {};
          if (null != t3) for (var n3 in t3) "default" !== n3 && Object.prototype.hasOwnProperty.call(t3, n3) && h(e3, t3, n3);
          return m(e3, t3), e3;
        }
        function A(t3) {
          return t3 && t3.__esModule ? t3 : { default: t3 };
        }
        function T(t3, e3, n3, i3) {
          if ("a" === n3 && !i3) throw new TypeError("Private accessor was defined without a getter");
          if ("function" == typeof e3 ? t3 !== e3 || !i3 : !e3.has(t3)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
          return "m" === n3 ? i3 : "a" === n3 ? i3.call(t3) : i3 ? i3.value : e3.get(t3);
        }
        function N(t3, e3, n3, i3, o2) {
          if ("m" === i3) throw new TypeError("Private method is not writable");
          if ("a" === i3 && !o2) throw new TypeError("Private accessor was defined without a setter");
          if ("function" == typeof e3 ? t3 !== e3 || !o2 : !e3.has(t3)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
          return "a" === i3 ? o2.call(t3, n3) : o2 ? o2.value = n3 : e3.set(t3, n3), n3;
        }
      } }, e = {};
      function n(i2) {
        var o = e[i2];
        if (void 0 !== o) return o.exports;
        var r = e[i2] = { exports: {} };
        return t[i2].call(r.exports, r, r.exports, n), r.exports;
      }
      n.d = (t2, e2) => {
        for (var i2 in e2) n.o(e2, i2) && !n.o(t2, i2) && Object.defineProperty(t2, i2, { enumerable: true, get: e2[i2] });
      }, n.o = (t2, e2) => Object.prototype.hasOwnProperty.call(t2, e2), n.r = (t2) => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(t2, "__esModule", { value: true });
      };
      var i = n(3056);
      module.exports = i;
    })();
  }
});

// src/ui/utils/paragonSDK.js
var require_paragonSDK = __commonJS({
  "src/ui/utils/paragonSDK.js"(exports, module) {
    var ParagonSDKLoader = class {
      constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.sdk = null;
        this.loadPromise = null;
      }
      /**
       * Load the Paragon SDK dynamically in the renderer process
       * @returns {Promise<Object>} The loaded Paragon SDK
       */
      async loadSDK() {
        console.log("[ParagonSDK] \u{1F504} Loading Paragon SDK...");
        if (this.isLoaded && this.sdk) {
          console.log("[ParagonSDK] \u2705 SDK already loaded");
          return this.sdk;
        }
        if (this.isLoading) {
          console.log("[ParagonSDK] \u23F3 SDK already loading, waiting...");
          return await this.loadPromise;
        }
        this.isLoading = true;
        this.loadPromise = this._loadSDKInternal();
        try {
          this.sdk = await this.loadPromise;
          this.isLoaded = true;
          console.log("[ParagonSDK] \u2705 SDK loaded successfully");
          return this.sdk;
        } catch (error) {
          console.error("[ParagonSDK] \u274C Failed to load SDK:", error);
          this.isLoading = false;
          throw error;
        }
      }
      /**
       * Internal method to load the SDK
       * @private
       */
      async _loadSDKInternal() {
        try {
          console.log("[ParagonSDK] \u{1F4E6} Attempting dynamic import...");
          const module2 = await Promise.resolve().then(() => __toESM(require_src()));
          const sdk = module2.paragon || module2.default || module2;
          if (sdk) {
            console.log("[ParagonSDK] \u2705 Loaded via dynamic import");
            return sdk;
          }
        } catch (error) {
          console.warn("[ParagonSDK] \u26A0\uFE0F Dynamic import failed:", error.message);
        }
        try {
          console.log("[ParagonSDK] \u{1F4E6} Attempting webpack require...");
          if (typeof __webpack_require__ !== "undefined") {
            const module2 = __webpack_require__("@useparagon/connect");
            const sdk = module2.paragon || module2.default || module2;
            if (sdk) {
              console.log("[ParagonSDK] \u2705 Loaded via webpack require");
              return sdk;
            }
          }
        } catch (error) {
          console.warn("[ParagonSDK] \u26A0\uFE0F Webpack require failed:", error.message);
        }
        try {
          console.log("[ParagonSDK] \u{1F4E6} Attempting direct file load...");
          const script = document.createElement("script");
          script.src = "../node_modules/@useparagon/connect/dist/src/index.js";
          return new Promise((resolve, reject) => {
            script.onload = () => {
              if (window.paragon) {
                console.log("[ParagonSDK] \u2705 Loaded via script tag");
                resolve(window.paragon);
              } else {
                reject(new Error("Paragon SDK loaded but not found on window object"));
              }
            };
            script.onerror = (error) => {
              reject(new Error(`Failed to load Paragon SDK script: ${error.message}`));
            };
            document.head.appendChild(script);
          });
        } catch (error) {
          console.error("[ParagonSDK] \u274C Direct file load failed:", error.message);
        }
        throw new Error("All Paragon SDK loading methods failed");
      }
      /**
       * Get the loaded SDK instance
       * @returns {Object|null} The SDK instance or null if not loaded
       */
      getSDK() {
        return this.sdk;
      }
      /**
       * Check if SDK is loaded
       * @returns {boolean} True if SDK is loaded
       */
      isSDKLoaded() {
        return this.isLoaded && this.sdk !== null;
      }
      /**
       * Initialize the SDK with authentication
       * @param {string} projectId - The Paragon project ID
       * @param {string} userToken - The user authentication token
       */
      async authenticate(projectId, userToken) {
        if (!this.isSDKLoaded()) {
          await this.loadSDK();
        }
        if (this.sdk && this.sdk.authenticate) {
          return await this.sdk.authenticate(projectId, userToken);
        } else {
          throw new Error("Paragon SDK not loaded or authenticate method not available");
        }
      }
    };
    var paragonLoader = new ParagonSDKLoader();
    window.ParagonSDKLoader = ParagonSDKLoader;
    window.paragonLoader = paragonLoader;
    if (typeof module !== "undefined" && module.exports) {
      module.exports = { ParagonSDKLoader, paragonLoader };
    }
    console.log("[ParagonSDK] \u{1F527} Paragon SDK loader initialized");
  }
});
// Make paragon available globally for browser compatibility
try {
  const sdkModule = require_src();
  window.paragon = sdkModule.paragon;
  window.connectSingleton = sdkModule.connectSingleton;
  console.log('[ParagonSDK] ✅ Enhanced SDK exposed globally:', { paragon: !!window.paragon, connectSingleton: !!window.connectSingleton });
} catch (err) {
  console.error('[ParagonSDK] ❌ Failed to expose SDK globally:', err);
}
/*! Bundled license information:

@useparagon/connect/dist/src/index.js:
  (*! For license information please see index.js.LICENSE.txt *)
*/
//# sourceMappingURL=paragonSDK.js.map
