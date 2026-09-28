(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const absent = "Not recorded";
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const saved = (value) => {
    if (value === undefined || value === null || value === "") return absent;
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  };
  const node = (tag, value) => {
    const element = document.createElement(tag);
    element.textContent = saved(value);
    return element;
  };
  const layers = [
    { key: "request", name: "Request", title: "Where the thread begins.", description: "The request reference and mission summary, exactly as saved.", fields: (m) => [["Request ID", m.request_id], ["Mission ID", m.id], ["Label", m.label], ["Summary", m.summary]] },
    { key: "scope", name: "Scope", title: "The edges of the paper.", description: "Scope and authority need their own records. Neither can be reconstructed from a summary or completion state.", fields: (m) => [["Structured scope", m.scope], ["Authority record", m.authority]] },
    { key: "worker", name: "Worker", title: "The hands behind the fold.", description: "A mission identifier does not identify its worker. A saved state does not establish tool attachment.", fields: (m) => [["Structured worker record", m.worker], ["Tool attachment record", m.tool_attachment]] },
    { key: "artifact", name: "Artifact", title: "What the thread points to.", description: "An evidence reference is a saved pointer. This reader does not fetch its target or verify artifact bytes.", fields: (m) => [["Evidence ID", m.evidence_id], ["Structured artifact record", m.artifact]] },
    { key: "verification", name: "Verification", title: "Hold it up to the light.", description: "Saved proof and its limits. Snapshot-wide checks appear separately below; they are not assumed to verify this mission.", fields: (m) => [["Proof and limits", m.proof], ["Blocker", m.blocker], ["Mission observed at (saved)", m.observed_at], ["Structured verification record", m.verification]] },
    { key: "acceptance", name: "Acceptance", title: "The last fold belongs to a human.", description: "Worker completion and formal acceptance are separate. A proved_complete state reports completion; it does not establish formal acceptance, an accepting person, or an acceptance date.", fields: (m) => [["Recorded mission / worker completion state", m.state], ["Formal acceptance record", m.acceptance]] },
  ];
  let snapshot = null;
  let missions = [];
  let activeLayer = 0;
  let copyAttempt = 0;
  let freshness = "No snapshot loaded.";
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const selectedMission = () => missions[Number($("mission").value)] || null;

  function fillFields(target, fields) {
    target.replaceChildren();
    for (const [label, value] of fields) {
      const detail = node("dd", value);
      if (saved(value) === absent) detail.classList.add("missing");
      target.append(node("dt", label), detail);
    }
  }

  function traceFor(mission) {
    const lines = ["SKEIN / NIGHT GARDEN — SAVED MISSION TRACE", "Companion reader; not an official Skeinsmith launch packet.", "Source: ./data/state.json", freshness, `Snapshot observed at: ${saved(snapshot?.observed_at)}`, `Evidence observed at: ${saved(snapshot?.evidence_observed_at)}`];
    for (const layer of layers) {
      lines.push("", layer.name.toUpperCase(), layer.description);
      for (const [label, value] of layer.fields(mission)) lines.push(`${label}: ${saved(value)}`);
    }
    lines.push("", "No execution, artifact retrieval, fresh verification, or formal acceptance occurs in this reader. Snapshot-wide checks and notes are not attributed to this mission.");
    return lines.join("\n");
  }

  function renderLayer() {
    const layer = layers[activeLayer];
    const mission = selectedMission();
    tabs.forEach((tab, index) => {
      tab.setAttribute("aria-selected", String(index === activeLayer));
      tab.tabIndex = index === activeLayer ? 0 : -1;
    });
    $("art").dataset.layer = layer.key;
    $("evidence-panel").setAttribute("aria-labelledby", `tab-${layer.key}`);
    $("fold-number").textContent = `FOLD ${String(activeLayer + 1).padStart(2, "0")} / ${layer.name.toUpperCase()}`;
    $("fold-title").textContent = layer.title;
    $("fold-description").textContent = layer.description;
    $("selected-mission").textContent = mission ? `Selected thread: ${saved(mission.label ?? mission.id)}` : "No recorded mission selected";
    fillFields($("evidence"), layer.fields(mission || {}));
    $("trace").value = mission ? traceFor(mission) : "No mission selected. No mission evidence is being assumed.";
    $("copy").disabled = !mission;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => { activeLayer = index; renderLayer(); });
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activeLayer = next;
      renderLayer();
      tabs[next].focus();
    });
  });

  function renderContext() {
    fillFields($("snapshot-times"), [["Snapshot observed at", snapshot?.observed_at], ["Evidence observed at", snapshot?.evidence_observed_at]]);
    const checks = $("snapshot-checks");
    checks.replaceChildren();
    if (Array.isArray(snapshot?.checks) && snapshot.checks.length) {
      snapshot.checks.forEach((check) => {
        const article = document.createElement("article");
        if (isRecord(check)) {
          article.append(node("h3", check.label));
          const fields = document.createElement("dl");
          fillFields(fields, [["State", check.state], ["Detail", check.detail], ["Observed at", check.observed_at], ["Source", check.source]]);
          article.append(fields);
        } else article.append(node("pre", check));
        checks.append(article);
      });
    } else checks.append(node("p", "Snapshot checks: Not recorded"));
    $("snapshot-notes").textContent = saved(snapshot?.notes);
  }

  function resetCopyStatus() { copyAttempt += 1; $("copy-status").textContent = ""; }
  $("mission").addEventListener("change", () => { resetCopyStatus(); renderLayer(); });
  $("copy").addEventListener("click", async () => {
    if (!selectedMission()) return;
    const attempt = ++copyAttempt;
    const trace = $("trace").value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(trace);
      if (attempt === copyAttempt) $("copy-status").textContent = "Trace copied. Nothing submitted or accepted.";
    } catch {
      if (attempt !== copyAttempt) return;
      $("trace-details").open = true;
      $("trace").focus();
      $("trace").select();
      $("copy-status").textContent = "Automatic copy is unavailable. The trace is selected below; use your device’s Copy command.";
    }
  });

  async function load() {
    $("reload").disabled = true;
    resetCopyStatus();
    $("load-status").textContent = snapshot ? "Rereading snapshot; the previous saved record remains visible." : "Reading saved snapshot…";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("./data/state.json", { cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal });
      if (!response.ok) throw new Error("Snapshot unavailable");
      const incoming = await response.json();
      if (!isRecord(incoming) || (incoming.missions !== undefined && !Array.isArray(incoming.missions))) throw new Error("Invalid snapshot shape");
      const previous = selectedMission();
      const previousIndex = Number($("mission").value);
      snapshot = incoming;
      const records = incoming.missions || [];
      missions = records.filter(isRecord);
      const skipped = records.length - missions.length;
      const selector = $("mission");
      selector.replaceChildren();
      missions.forEach((mission, index) => {
        const option = node("option", `${saved(mission.label ?? mission.id)} · ${saved(mission.state)} · ${saved(mission.id)}`);
        option.value = String(index);
        selector.append(option);
      });
      if (!missions.length) {
        const option = node("option", "No recorded missions");
        option.value = "";
        selector.append(option);
      } else {
        // Prefer the exact saved row when IDs repeat in historical snapshots.
        let index = previous ? missions.findIndex((m) => JSON.stringify(m) === JSON.stringify(previous)) : -1;
        if (index < 0 && previous?.id !== undefined) index = missions.findIndex((m) => m.id === previous.id && m.observed_at === previous.observed_at);
        selector.value = String(index >= 0 ? index : Math.min(previousIndex || 0, missions.length - 1));
      }
      selector.disabled = !missions.length;
      freshness = "Saved snapshot; not a live feed. Rereading does not refresh evidence dates.";
      $("load-status").textContent = missions.length ? `${missions.length} recorded thread${missions.length === 1 ? "" : "s"}. ${freshness}` : "No missions recorded in this snapshot. The folds remain empty; reread after a mission is saved.";
      if (skipped) $("load-status").textContent += ` ${skipped} malformed mission record${skipped === 1 ? " was" : "s were"} omitted.`;
      renderContext();
      renderLayer();
    } catch {
      freshness = snapshot ? "Reread failed. Showing the last successfully loaded snapshot; observation dates have not changed." : "Snapshot unavailable. No mission evidence loaded.";
      $("load-status").textContent = snapshot ? freshness : "Could not read ./data/state.json. Open this page beside Night Garden through its local server, then choose Reread snapshot. No mission state is assumed.";
      if (!snapshot) {
        $("mission").replaceChildren(node("option", "Snapshot unavailable"));
        $("mission").disabled = true;
      }
      renderLayer();
    } finally {
      clearTimeout(timeout);
      $("reload").disabled = false;
    }
  }
  $("reload").addEventListener("click", load);
  renderContext();
  load();
})();
