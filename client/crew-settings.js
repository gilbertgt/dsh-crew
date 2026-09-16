window.__ModuleLoader__.load({
  id: "dsh-crew",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;

    const SETTINGS_NAMESPACE = "dsh-crew-roles";
    const LOCALE_NAMESPACE = "dsh-crew-settings";
    const ROLE_DEFS = [
      ["researcher", "roleResearcher"],
      ["architect", "roleArchitect"],
      ["engineer", "roleEngineer"],
      ["test_engineer", "roleTestEngineer"],
      ["code_engineer", "roleCodeEngineer"],
      ["qa", "roleQa"],
      ["code_reviewer", "roleCodeReviewer"],
      ["security_reviewer", "roleSecurityReviewer"],
      ["doc_reviewer", "roleDocReviewer"],
    ];

    const zh = {
      nav: "Crew",
      title: "Crew 角色模型設定",
      description: "為每個 child role 指定 Provider、Model 與 Reasoning Effort。",
      unsaved: "尚未儲存",
      readOnly: "目前設定不可寫入；請在可持久化的 DSH Web 連線中修改。",
      settingsUnavailable: "角色設定目前不可用；以下顯示唯讀預設值。",
      save: "儲存",
      saving: "儲存中…",
      discard: "捨棄變更",
      saveFailed: "設定未能儲存，草稿仍保留。",
      conflict: "設定已在其他位置更新。請捨棄草稿後重新載入。",
      catalogLoading: "正在載入 Provider 與 Model…",
      catalogFailed: "無法載入 Provider/Model 目錄。",
      catalogRetry: "重試",
      catalogPartial: "部分 Provider 暫時無法載入；已儲存的值仍會保留。",
      rootTitle: "PM / Root Session",
      rootHint: "顯示 host model catalog 的目前預設路由；角色會在沒有自訂 route 時繼承 parent/session。",
      noRoot: "目前沒有可顯示的 host 預設路由。",
      mode: "路由模式",
      inherit: "繼承 PM / Session",
      custom: "自訂 route",
      provider: "Provider",
      model: "Model",
      reasoning: "Reasoning Effort",
      defaultEffort: "Default / Inherit",
      noReasoning: "此 Model 未公布可選 reasoning effort；只使用 adapter default。",
      unknownReasoning: "已儲存的 reasoning effort（能力未知）",
      unavailable: "目前不可用",
      unavailableProvider: "已儲存，但 Provider 目前不可用",
      unavailableModel: "已儲存，但 Model 目前不可用",
      unavailableReasoning: "Reasoning Effort 不在目前的 Model 能力清單中",
      invalid: "Invalid",
      invalidRoute: "此 route 不完整；請選擇 Provider 與 Model。",
      inheritedProvider: "繼承 parent Provider",
      presetFallback: "目前使用 preset legacy fallback；捨棄 user override 後會回到它。",
      presetFallbackInherit: "這個角色仍在使用 preset 的 legacy route，所以「繼承」目前不會改變實際路由。",
      presetFallbackFix: "實際路由要真正回到 PM / Session，請把 preset 裡的 roleModels 那一行刪掉。",
      reset: "重設此角色的 user override",
      undoDraft: "放棄這個角色的草稿變更",
      roleResearcher: "Researcher",
      roleArchitect: "Architect",
      roleEngineer: "Engineer",
      roleTestEngineer: "Test Engineer",
      roleCodeEngineer: "Code Engineer",
      roleQa: "QA",
      roleCodeReviewer: "Code Reviewer",
      roleSecurityReviewer: "Security Reviewer",
      roleDocReviewer: "Doc Reviewer",
    };

    const en = {
      nav: "Crew",
      title: "Crew role model settings",
      description: "Choose a Provider, Model and Reasoning Effort for each child role.",
      unsaved: "Unsaved",
      readOnly: "These settings are not writable on this DSH Web connection.",
      settingsUnavailable: "Role settings are unavailable. Showing read-only defaults.",
      save: "Save",
      saving: "Saving…",
      discard: "Discard changes",
      saveFailed: "The settings could not be saved; the draft is still kept.",
      conflict: "The settings changed elsewhere. Discard the draft and reload.",
      catalogLoading: "Loading providers and models…",
      catalogFailed: "The provider/model catalog could not be loaded.",
      catalogRetry: "Retry",
      catalogPartial: "Some providers could not be loaded; saved values remain visible.",
      rootTitle: "PM / Root Session",
      rootHint: "The host model catalog default. A role inherits the parent/session route without a custom route.",
      noRoot: "No host default route is available.",
      mode: "Route mode",
      inherit: "Inherit PM / Session",
      custom: "Custom route",
      provider: "Provider",
      model: "Model",
      reasoning: "Reasoning Effort",
      defaultEffort: "Default / Inherit",
      noReasoning: "This model advertises no selectable reasoning effort; the adapter default is used.",
      unknownReasoning: "Saved reasoning effort (capability unknown)",
      unavailable: "Unavailable",
      unavailableProvider: "Saved, but the provider is unavailable",
      unavailableModel: "Saved, but the model is unavailable",
      unavailableReasoning: "Reasoning effort is not in the model's current capability list",
      invalid: "Invalid",
      invalidRoute: "This route is incomplete; choose a provider and model.",
      inheritedProvider: "Inherit parent provider",
      presetFallback: "Using the preset legacy fallback; discarding the user override returns to it.",
      presetFallbackInherit: "This role still runs on the preset's legacy route, so \"Inherit\" does not change the effective route yet.",
      presetFallbackFix: "To really return to PM / Session, delete that roleModels line from the preset.",
      reset: "Reset this role's user override",
      undoDraft: "Undo this role's draft change",
      roleResearcher: "Researcher",
      roleArchitect: "Architect",
      roleEngineer: "Engineer",
      roleTestEngineer: "Test Engineer",
      roleCodeEngineer: "Code Engineer",
      roleQa: "QA",
      roleCodeReviewer: "Code Reviewer",
      roleSecurityReviewer: "Security Reviewer",
      roleDocReviewer: "Doc Reviewer",
    };

    const css = `
      .dshCrewSettingsSection{display:flex;flex-direction:column;gap:14px;color:var(--dsw-alias-label-primary)}
      .dshCrewSettingsTitle{margin:0;font-size:18px;font-weight:600}
      .dshCrewSettingsDescription,.dshCrewSettingsHint,.dshCrewSettingsMuted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .dshCrewSettingsDescription{margin:-8px 0 0}
      .dshCrewSettingsBody{display:flex;flex-direction:column;gap:14px}
      .dshCrewSettingsNotice{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .dshCrewSettingsError{margin:0;color:var(--dsw-alias-label-error);font-size:12px;line-height:18px}
      .dshCrewSettingsRoot,.dshCrewSettingsRole{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px}
      .dshCrewSettingsRootTitle,.dshCrewSettingsRoleTitle{font-weight:600}
      .dshCrewSettingsRoleTitle{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .dshCrewSettingsFields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .dshCrewSettingsField{min-width:0;display:flex;flex-direction:column;gap:4px}
      .dshCrewSettingsField label{font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dshCrewSettingsField select{min-width:0;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-fill-t1);color:var(--dsw-alias-label-primary);padding:6px 7px;font:inherit;font-size:12px}
      .dshCrewSettingsField select:disabled{opacity:.55;cursor:not-allowed}
      .dshCrewSettingsStatus{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px}
      .dshCrewSettingsBadge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 7px;background:var(--dsw-alias-fill-t2);color:var(--dsw-alias-label-secondary)}
      .dshCrewSettingsBadgeWarning{color:var(--dsw-alias-label-tertiary)}
      .dshCrewSettingsBadgeError{color:var(--dsw-alias-label-error)}
      .dshCrewSettingsBadgeInfo{color:var(--dsw-alias-label-secondary)}
      .dshCrewSettingsBadgeWarn{color:var(--dsw-alias-label-warning)}
      .dshCrewSettingsReset{align-self:flex-start;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;text-decoration:underline;cursor:pointer}
      .dshCrewSettingsReset:disabled{opacity:.5;cursor:not-allowed}
      .dshCrewSettingsFooter{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:2px}
      .dshCrewSettingsFooter button{padding:6px 10px;border-radius:4px;font:inherit;font-size:12px;cursor:pointer}
      .dshCrewSettingsDiscard{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}
      .dshCrewSettingsSave{border:1px solid var(--dsw-alias-label-primary);background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}
      .dshCrewSettingsFooter button:disabled{opacity:.5;cursor:not-allowed}
      @media (max-width:700px){.dshCrewSettingsFields{grid-template-columns:1fr}}
    `;

    function installStyle() {
      if (typeof document === "undefined" || document.querySelector("style[data-dsh-crew-settings]") !== null) return;
      const style = document.createElement("style");
      style.dataset.dshCrewSettings = "true";
      style.textContent = css;
      document.head.appendChild(style);
    }

    function isObject(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    const UNSAFE_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

    function cloneRoleModels(value) {
      const result = Object.create(null);
      if (!isObject(value)) return result;
      for (const key of Object.keys(value)) {
        if (UNSAFE_RECORD_KEYS.has(key)) continue;
        const route = value[key];
        result[key] = isObject(route) ? { ...route } : route;
      }
      return result;
    }

    function hasOwn(object, key) {
      return isObject(object) && Object.prototype.hasOwnProperty.call(object, key);
    }

    function sameJson(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }

    function routeWithModel(route) {
      return isObject(route) && hasOwn(route, "model") && typeof route.model === "string" && route.model.length > 0;
    }

    /** Whether a stored route would really reach a child: `roleAgentOptions()` needs a model. */
    const routeHasModel = routeWithModel;

    function createStore(initial) {
      let snapshot = initial;
      const listeners = new Set();
      return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        set: (next) => {
          snapshot = next;
          for (const listener of [...listeners]) listener();
        },
      };
    }

    class CrewSettingsController {
      constructor(scope, ctx) {
        this.scope = scope;
        this.ctx = ctx;
        this.store = createStore({ available: false, writable: false, dirty: false, invalid: false, saving: false, failed: false, conflicted: false, roles: [], catalogGroups: [] });
        this.draftRoleModels = undefined;
        this.draftRevision = undefined;
        this.draftChangedRoles = new Set();
        this.saving = false;
        this.failed = false;
        this.conflicted = false;
        this.catalogGroups = [];
        this.catalogDefault = undefined;
        this.catalogStatus = "idle";
        this.catalogPartial = false;
        this.catalogGeneration = 0;
        this.catalogRefreshPending = false;
        this.disposed = false;
        this.unsubscribeScope = scope.subscribe(() => this.publish());
        this.publish();
        this.loadCatalog();
      }

      inject() {
        return {
          hooks: { crewSettings: this.store },
          editMode: (roleKey, value) => this.editMode(roleKey, value),
          editProvider: (roleKey, value) => this.editProvider(roleKey, value),
          editModel: (roleKey, value) => this.editModel(roleKey, value),
          editReasoning: (roleKey, value) => this.editReasoning(roleKey, value),
          resetRole: (roleKey) => this.resetRole(roleKey),
          retryCatalog: () => this.loadCatalog(),
          save: () => this.save(),
          discard: () => this.discard(),
        };
      }

      currentRoleModels() {
        return cloneRoleModels(this.scope.getSnapshot().value?.roleModels);
      }

      desiredRoleModels() {
        return this.draftRoleModels === undefined ? this.currentRoleModels() : cloneRoleModels(this.draftRoleModels);
      }

      beginDraft() {
        if (this.draftRoleModels !== undefined) return this.draftRoleModels;
        const snapshot = this.scope.getSnapshot();
        this.draftRoleModels = this.currentRoleModels();
        this.draftRevision = snapshot.revision;
        return this.draftRoleModels;
      }

      touchRole(roleKey, route) {
        const draft = this.beginDraft();
        if (route === undefined) delete draft[roleKey];
        else draft[roleKey] = isObject(route) ? { ...route } : route;
        this.draftChangedRoles.add(roleKey);
        this.failed = false;
        this.conflicted = false;
        this.publish();
      }

      catalogRoute(provider, model) {
        if (provider !== undefined && model !== undefined) return { provider, model };
        const defaultProvider = this.catalogDefault?.provider;
        const defaultModel = this.catalogDefault?.model;
        const defaultGroup = this.catalogGroups.find((group) => group.id === defaultProvider);
        if (defaultProvider && defaultModel && defaultGroup?.models?.some((candidate) => candidate.id === defaultModel)) {
          return { provider: defaultProvider, model: defaultModel };
        }
        for (const group of this.catalogGroups) {
          const first = group.models?.[0];
          if (first !== undefined) return { provider: group.id, model: first.id };
        }
        return { provider: "", model: "" };
      }

      groupFor(provider) {
        if (provider) return this.catalogGroups.find((group) => group.id === provider);
        const fallback = this.catalogDefault?.provider;
        return this.catalogGroups.find((group) => group.id === fallback);
      }

      editMode(roleKey, value) {
        if (value === "inherit") {
          this.touchRole(roleKey, undefined);
          return;
        }
        const current = this.desiredRoleModels()[roleKey];
        if (routeWithModel(current)) {
          this.touchRole(roleKey, current);
          return;
        }
        const next = this.catalogRoute();
        this.touchRole(roleKey, next);
      }

      editProvider(roleKey, provider) {
        const current = this.desiredRoleModels()[roleKey];
        const group = this.groupFor(provider);
        const model = group?.models?.[0]?.id ?? (provider === "" ? this.catalogDefault?.model ?? "" : "");
        const next = { ...(isObject(current) ? current : {}), provider, model };
        if (current?.provider !== provider || current?.model !== model) delete next.reasoningEffort;
        this.touchRole(roleKey, next);
      }

      editModel(roleKey, model) {
        const current = this.desiredRoleModels()[roleKey];
        const next = { ...(isObject(current) ? current : {}), model };
        if (current?.model !== model) delete next.reasoningEffort;
        this.touchRole(roleKey, next);
      }

      editReasoning(roleKey, value) {
        const current = this.desiredRoleModels()[roleKey];
        const next = { ...(isObject(current) ? current : {}) };
        if (value) next.reasoningEffort = value;
        else delete next.reasoningEffort;
        this.touchRole(roleKey, next);
      }

      resetRole(roleKey) {
        this.touchRole(roleKey, undefined);
      }

      clearDraft() {
        this.draftRoleModels = undefined;
        this.draftRevision = undefined;
        this.draftChangedRoles.clear();
        this.failed = false;
        this.conflicted = false;
      }

      discard() {
        if (this.saving) return;
        this.clearDraft();
        this.publish();
      }

      routeProjection(roleKey, route, snapshot) {
        const base = snapshot.base?.roleModels;
        const user = snapshot.user?.roleModels;
        const desired = this.desiredRoleModels();
        const hasRoute = hasOwn(desired, roleKey);
        const draftOwnsRole = this.draftRoleModels !== undefined && this.draftChangedRoles.has(roleKey);
        const source = draftOwnsRole
          ? hasRoute ? "settings" : hasOwn(base, roleKey) ? "legacy" : "inherit"
          : hasOwn(user, roleKey) ? "settings" : hasOwn(base, roleKey) ? "legacy" : "inherit";
        const provider = isObject(route) && hasOwn(route, "provider") && typeof route.provider === "string" ? route.provider : "";
        const model = isObject(route) && hasOwn(route, "model") && typeof route.model === "string" ? route.model : "";
        const group = this.groupFor(provider);
        const modelInfo = group?.models?.find((candidate) => candidate.id === model);
        const providerAvailable = provider.length === 0 || this.catalogGroups.some((candidate) => candidate.id === provider);
        const modelAvailable = model.length > 0 && modelInfo !== undefined;
        const hasEffectiveRoute = hasRoute && model.length > 0;
        const reasoningEffort = isObject(route) && hasOwn(route, "reasoningEffort") && typeof route.reasoningEffort === "string" ? route.reasoningEffort : "";
        const advertisedEfforts = modelInfo?.reasoning?.efforts ?? [];
        const reasoningAvailable = modelInfo?.reasoning !== undefined;
        const reasoningInvalid = reasoningAvailable && reasoningEffort.length > 0 && !advertisedEfforts.some((effort) => effort.id === reasoningEffort);
        const invalidRoute = source === "settings" && hasRoute && (!isObject(route) || model.length === 0);
        // THE preset's own fallback route, which no settings write can reach.
        //
        // The namespace composes the user layer ON TOP of the preset's legacy
        // `roleModels`. Unsetting the user key therefore does not fall back to the
        // session route while that line is still in the preset: it falls back to
        // the legacy route, and `roleAgentOptions()` keeps handing it to the child.
        // Showing "Inherit" here used to promise something the write cannot do, and
        // the very next render then reported the legacy route as an unavailable
        // provider — a warning about a route the user never chose and cannot remove
        // from this page.
        const storedHasUserRoute = hasOwn(user, roleKey) && routeHasModel(user[roleKey]);
        // The user's OWN route stops the legacy route from being what runs, so the
        // fallback is only in force when they have none — or when a draft that owns
        // this role has just taken theirs away, which is the half-clicked "Inherit".
        const userRouteReachesTheChild = draftOwnsRole ? hasRoute && model.length > 0 : storedHasUserRoute;
        const legacyFallback = source === "legacy" && !userRouteReachesTheChild && routeHasModel(base?.[roleKey]);
        let status = source === "inherit" || !hasEffectiveRoute && !invalidRoute ? "inherit" : "custom";
        if (hasEffectiveRoute && !providerAvailable) status = "unavailable-provider";
        else if (hasEffectiveRoute && providerAvailable && !modelAvailable) status = "unavailable-model";
        else if (hasEffectiveRoute && reasoningInvalid) status = "unavailable-reasoning";
        else if (invalidRoute) status = "invalid";
        else if (legacyFallback) status = "legacy-fallback";
        return {
          key: roleKey,
          route: isObject(route) ? { ...route } : route,
          source,
          hasRoute,
          hasEffectiveRoute,
          provider,
          model,
          providerAvailable,
          modelAvailable,
          modelInfo,
          reasoningEffort,
          reasoningAvailable,
          reasoningInvalid,
          invalidRoute,
          legacyFallback,
          // Only an incomplete route blocks Save. A route whose provider, model
          // or Reasoning Effort is merely absent from the live catalog is KEPT
          // and shown as a warning: this namespace deliberately does not freeze
          // the catalog into an enum, and exact validity is the DSH host
          // preflight's call at child start.
          invalid: invalidRoute,
          status,
          /** Whether the USER wrote this role's route, as opposed to the preset's legacy one. */
          hasStoredUserRoute: storedHasUserRoute,
          hasUserOverride: hasOwn(user, roleKey) || storedHasUserRoute || draftOwnsRole,
        };
      }

      projection() {
        const snapshot = this.scope.getSnapshot();
        const desired = this.desiredRoleModels();
        const roles = ROLE_DEFS.map(([key, labelKey]) => ({
          ...this.routeProjection(key, desired[key], snapshot),
          labelKey,
        }));
        // Only a DRAFT that cannot be written blocks Save. A stored route that is
        // already broken is shown with its own error but does not stop the user
        // from saving a different role: the write sends path ops for the changed
        // roles only, so blocking would not repair it either.
        const invalid = roles.some((role) => role.invalid && this.draftChangedRoles.has(role.key));
        const rootModelInfo = this.catalogGroups.find((group) => group.id === this.catalogDefault?.provider)?.models?.find((model) => model.id === this.catalogDefault?.model);
        return {
          available: snapshot.status === "ready",
          writable: snapshot.writable === true,
          dirty: this.draftChangedRoles.size > 0,
          invalid,
          saving: this.saving,
          failed: this.failed,
          conflicted: this.conflicted,
          roles,
          catalogGroups: this.catalogGroups,
          catalogDefault: this.catalogDefault,
          catalogStatus: this.catalogStatus,
          catalogPartial: this.catalogPartial,
          rootReasoningDefault: rootModelInfo?.reasoning?.defaultEffort,
        };
      }

      publish() {
        if (!this.disposed) this.store.set(this.projection());
      }

      async save() {
        const snapshot = this.scope.getSnapshot();
        if (this.disposed || snapshot.status !== "ready" || !snapshot.writable || this.saving || this.draftChangedRoles.size === 0) return;
        if (this.projection().invalid) return;
        if (snapshot.revision !== this.draftRevision) {
          this.conflicted = true;
          this.publish();
          return;
        }
        const desired = this.desiredRoleModels();
        const ops = [...this.draftChangedRoles].sort().map((roleKey) => desired[roleKey] === undefined
          ? { op: "unset", path: ["roleModels", roleKey] }
          : { op: "set", path: ["roleModels", roleKey], value: desired[roleKey] });
        this.saving = true;
        this.failed = false;
        this.conflicted = false;
        this.publish();
        try {
          await this.scope.mutate(ops, this.draftRevision);
        } catch (error) {
          this.saving = false;
          this.failed = true;
          this.conflicted = Boolean(error?.code === "SETTINGS_CONFLICT" || /conflict|revision/i.test(error?.message ?? ""));
          this.publish();
          return;
        }
        const landedSnapshot = this.scope.getSnapshot();
        const user = landedSnapshot.user?.roleModels;
        const landed = [...this.draftChangedRoles].every((roleKey) => desired[roleKey] === undefined
          ? !hasOwn(user, roleKey)
          : sameJson(user?.[roleKey], desired[roleKey]));
        this.saving = false;
        if (landed) this.clearDraft();
        else {
          this.failed = true;
          this.conflicted = landedSnapshot.revision !== this.draftRevision;
        }
        this.publish();
      }

      staleCatalogResult(generation) {
        if (this.disposed) return true;
        if (generation === this.catalogGeneration) return false;
        if (this.catalogRefreshPending) {
          this.catalogRefreshPending = false;
          this.catalogStatus = "idle";
          this.loadCatalog();
        }
        return true;
      }

      async loadCatalog() {
        if (this.disposed || this.catalogStatus === "loading") return;
        const generation = ++this.catalogGeneration;
        this.catalogStatus = "loading";
        this.publish();
        try {
          const response = await this.ctx.remote.session.modelCatalog();
          if (this.staleCatalogResult(generation)) return;
          if (response?.ok && response.value) {
            this.catalogGroups = response.value.groups ?? [];
            this.catalogDefault = response.value.default;
            this.catalogPartial = (response.value.failures?.length ?? 0) > 0;
            this.catalogStatus = "ready";
          } else {
            this.catalogStatus = "error";
          }
        } catch {
          if (this.staleCatalogResult(generation)) return;
          this.catalogStatus = "error";
        }
        const refreshAgain = this.catalogRefreshPending;
        this.catalogRefreshPending = false;
        this.publish();
        if (refreshAgain) this.refreshCatalog();
      }

      refreshCatalog() {
        if (this.disposed) return;
        if (this.catalogStatus === "loading") {
          this.catalogRefreshPending = true;
          return;
        }
        this.catalogStatus = "idle";
        this.catalogGroups = [];
        this.catalogDefault = undefined;
        this.loadCatalog();
      }

      resetConnection() {
        if (this.disposed) return;
        this.catalogGeneration += 1;
        this.catalogStatus = "idle";
        this.refreshCatalog();
      }

      dispose() {
        this.disposed = true;
        this.unsubscribeScope?.();
      }
    }

    function text(value) {
      return value === undefined || value === null ? "" : String(value);
    }

    function routeText(route) {
      if (!route?.provider || !route?.model) return "";
      return `${route.provider}/${route.model}`;
    }

    function SelectField({ id, label, value, options, disabled, onChange }) {
      return h("div", { className: "dshCrewSettingsField" },
        h("label", { htmlFor: id }, label),
        h("select", {
          id,
          value: value ?? "",
          disabled,
          onChange: (event) => onChange(event.target.value),
        }, options.map((option) => h("option", {
          key: `${id}:${option.value}:${option.label}`,
          value: option.value,
          disabled: option.disabled === true,
        }, option.label))),
      );
    }

    function Badge({ children, tone }) {
      return h("span", { className: `dshCrewSettingsBadge${tone ? ` dshCrewSettingsBadge${tone}` : ""}` }, children);
    }

    function roleStatus(role, t) {
      switch (role.status) {
        case "unavailable-provider": return [t("unavailableProvider"), "Warning"];
        case "unavailable-model": return [t("unavailableModel"), "Warning"];
        case "unavailable-reasoning": return [t("unavailableReasoning"), "Warning"];
        case "invalid": return [t("invalid"), "Error"];
        case "legacy-fallback": return [t("presetFallback"), "Warn"];
        case "custom": return [t("custom"), "Info"];
        default: return [t("inherit"), ""];
      }
    }

    function RoleRow({ role, state, t, editMode, editProvider, editModel, editReasoning, resetRole }) {
      const disabled = !state.available || !state.writable || state.saving;
      const route = role.route ?? {};
      const group = role.provider ? state.catalogGroups.find((candidate) => candidate.id === role.provider) : state.catalogGroups.find((candidate) => candidate.id === state.catalogDefault?.provider);
      const providers = [{ value: "", label: t("inheritedProvider") }, ...state.catalogGroups.map((provider) => ({ value: provider.id, label: `${provider.name} (${provider.id})` }))];
      if (role.provider && !role.providerAvailable) providers.push({ value: role.provider, label: `${role.provider} — ${t("unavailable")}`, disabled: true });
      const models = (group?.models ?? []).map((model) => ({ value: model.id, label: `${model.name} (${model.id})` }));
      if (role.model && !role.modelAvailable) models.push({ value: role.model, label: `${role.model} — ${t("unavailable")}`, disabled: true });
      if (models.length === 0) models.push({ value: role.model ?? "", label: role.model || t("noRoot"), disabled: true });
      const reasoningOptions = [{ value: "", label: t("defaultEffort") }, ...(role.modelInfo?.reasoning?.efforts ?? []).map((effort) => ({ value: effort.id, label: effort.name ? `${effort.name} (${effort.id})` : effort.id }))];
      if (role.reasoningEffort && (!role.reasoningAvailable || role.reasoningInvalid)) reasoningOptions.push({ value: role.reasoningEffort, label: `${role.reasoningEffort} — ${t("unavailable")}`, disabled: true });
      const [statusText, tone] = roleStatus(role, t);
      // A legacy fallback route is either inherited in the store or drafted towards
      // "Inherit" by the user. Either way the mode control belongs on `inherit`:
      // that is the state the settings hold, and it is the state the user asked for.
      const customActive = role.hasEffectiveRoute || role.source === "settings" && role.hasRoute;
      const mode = role.legacyFallback ? "inherit" : customActive ? "custom" : "inherit";
      return h("div", { className: "dshCrewSettingsRole" },
        h("div", { className: "dshCrewSettingsRoleTitle" },
          h("span", null, t(role.labelKey)),
          h("div", { className: "dshCrewSettingsStatus" },
            h(Badge, { tone }, statusText),
            role.legacyFallback ? null : role.source === "legacy" ? h("span", { className: "dshCrewSettingsMuted" }, t("presetFallback")) : null,
          ),
        ),
        h("div", { className: "dshCrewSettingsFields" },
          h(SelectField, {
            id: `dsh-crew-mode-${role.key}`,
            label: t("mode"),
            value: mode,
            disabled,
            options: [{ value: "inherit", label: t("inherit") }, { value: "custom", label: t("custom") }],
            onChange: (value) => editMode(role.key, value),
          }),
          h(SelectField, {
            id: `dsh-crew-provider-${role.key}`,
            label: t("provider"),
            value: role.provider,
            disabled: disabled || !customActive,
            options: providers,
            onChange: (value) => editProvider(role.key, value),
          }),
          h(SelectField, {
            id: `dsh-crew-model-${role.key}`,
            label: t("model"),
            value: role.model,
            disabled: disabled || !customActive,
            options: models,
            onChange: (value) => editModel(role.key, value),
          }),
        ),
        role.hasEffectiveRoute
          ? h(React.Fragment, null,
            h(SelectField, {
              id: `dsh-crew-reasoning-${role.key}`,
              label: t("reasoning"),
              value: role.reasoningEffort,
              disabled,
              options: reasoningOptions,
              onChange: (value) => editReasoning(role.key, value),
            }),
            !role.reasoningAvailable
              ? h("p", { className: "dshCrewSettingsHint" }, role.reasoningEffort ? `${t("unknownReasoning")}: ${role.reasoningEffort}` : t("noReasoning"))
              : role.reasoningInvalid
                ? h("p", { className: "dshCrewSettingsHint" }, `${t("unavailableReasoning")}: ${role.reasoningEffort}`)
                : null,
          )
          : null,
        role.invalidRoute ? h("p", { className: "dshCrewSettingsError" }, t("invalidRoute")) : null,
        // Said out loud, because the alternative is a control that looks like it
        // worked. `unset` cannot reach a route that lives in the preset, so the
        // page has to name where the fallback comes from and what removes it.
        role.legacyFallback
          ? h(React.Fragment, null,
            h("p", { className: "dshCrewSettingsHint" }, t("presetFallbackInherit")),
            h("p", { className: "dshCrewSettingsHint" }, t("presetFallbackFix")),
          )
          : null,
        role.hasUserOverride ? h("button", {
          type: "button",
          className: "dshCrewSettingsReset",
          disabled,
          onClick: () => resetRole(role.key),
        }, t(role.hasStoredUserRoute ? "reset" : "undoDraft")) : null,
      );
    }

    function CrewSettingsSection(props) {
      const t = props.t;
      const state = props.useCrewSettings((snapshot) => snapshot);
      const disabled = !state.available || !state.writable || state.saving;
      const root = state.catalogDefault;
      const rootModel = state.catalogGroups.find((group) => group.id === root?.provider)?.models?.find((model) => model.id === root?.model);
      const rootEffort = root?.reasoningEffort ?? state.rootReasoningDefault;
      const rootDisplay = root ? `${root.provider}/${root.model}${rootEffort ? ` · ${rootEffort}` : ""}` : t("noRoot");
      return h("div", { className: "dshCrewSettingsSection" },
        h("div", { className: "dshCrewSettingsRoleTitle" },
          h("h2", { className: "dshCrewSettingsTitle" }, t("title")),
          state.dirty ? h(Badge, null, t("unsaved")) : null,
        ),
        h("p", { className: "dshCrewSettingsDescription" }, t("description")),
        h("div", { className: "dshCrewSettingsBody" },
          !state.available ? h("p", { className: "dshCrewSettingsNotice", role: "status" }, t("settingsUnavailable")) : null,
          !state.writable ? h("p", { className: "dshCrewSettingsNotice", role: "status" }, t("readOnly")) : null,
          state.catalogStatus === "loading" ? h("p", { className: "dshCrewSettingsNotice", role: "status" }, t("catalogLoading")) : null,
          state.catalogStatus === "error" ? h("p", { className: "dshCrewSettingsError", role: "status" }, t("catalogFailed"), " ", h("button", { type: "button", onClick: props.retryCatalog, disabled }, t("catalogRetry"))) : null,
          state.catalogPartial ? h("p", { className: "dshCrewSettingsNotice", role: "status" }, t("catalogPartial")) : null,
          h("div", { className: "dshCrewSettingsRoot" },
            h("div", { className: "dshCrewSettingsRootTitle" }, t("rootTitle")),
            h("div", { className: "dshCrewSettingsStatus" }, h("code", null, rootDisplay)),
            rootModel?.description ? h("p", { className: "dshCrewSettingsHint" }, rootModel.description) : null,
            h("p", { className: "dshCrewSettingsHint" }, t("rootHint")),
          ),
          ...state.roles.map((role) => h(RoleRow, {
            key: role.key,
            role,
            state,
            t,
            editMode: props.editMode,
            editProvider: props.editProvider,
            editModel: props.editModel,
            editReasoning: props.editReasoning,
            resetRole: props.resetRole,
          })),
          state.conflicted ? h("p", { className: "dshCrewSettingsError", role: "alert" }, t("conflict")) : null,
          state.failed ? h("p", { className: "dshCrewSettingsError", role: "alert" }, t("saveFailed")) : null,
          h("div", { className: "dshCrewSettingsFooter" },
            h("button", { type: "button", className: "dshCrewSettingsDiscard", disabled: !state.available || !state.dirty || state.saving, onClick: props.discard }, t("discard")),
            h("button", { type: "button", className: "dshCrewSettingsSave", disabled: disabled || !state.dirty || state.invalid, onClick: props.save }, t(state.saving ? "saving" : "save")),
          ),
        ),
      );
    }

    const inject = ["slots", "locale", "remote", "remote.session", "settingsScope"];

    function apply(ctx) {
      const t = ctx.locale.bind(LOCALE_NAMESPACE);
      ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }), "dsh-crew: settings dictionaries");
      ctx.effect(() => {
        installStyle();
      }, "dsh-crew: settings styles");
      const controller = new CrewSettingsController(ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE }), ctx);
      ctx.effect(() => () => controller.dispose(), "dsh-crew: settings controller");
      ctx.effect(() => ctx.remote.$on("llm/adapters-updated", () => controller.refreshCatalog()), "dsh-crew: catalog invalidation");
      ctx.effect(() => ctx.remote.$on("settings/document-updated", () => controller.refreshCatalog()), "dsh-crew: settings invalidation");
      ctx.effect(() => ctx.on("connection/reset", () => controller.resetConnection()), "dsh-crew: connection reset");
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "crew",
        order: 30,
        label: () => t("nav"),
        locale: LOCALE_NAMESPACE,
        inject: () => controller.inject(),
      }, CrewSettingsSection));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
