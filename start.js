/*
  NOMERYS PREMIUM FORM
  ---------------------------------------------------
  Front-end GitHub Pages compatible.
  Aucun secret Stripe ici.
  Le webhook n8n doit créer Stripe Checkout et renvoyer :
  { "checkout_url": "https://checkout.stripe.com/..." }

  Champs Jotform conservés :
  q3_nom, q4_email, q36_avezvousDeja, q54_nombreDe, q65_ageDe,
  q37_q_arrive_city, q38_q_date_start, q39_q_date_end, q53_lieuPrecis,
  q41_q_climate, q47_q_regions, q48_q_style, q56_typeDe,
  q51_activitesA51, q64_already_paid
*/

const WEBHOOK_URL = "https://baptistepaixao2.app.n8n.cloud/webhook-test/voyage-form";
const SKIP_PAYMENT_FOR_TEST = true;
const MAX_TRAVELLERS = 10;
const MAX_TRIP_DAYS = 45;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const mount = $("#stepMount");
const backBtn = $("#backBtn");
const nextBtn = $("#nextBtn");
const errorBox = $("#inlineError");
const errorText = $("#inlineErrorText");
const toast = $("#toast");

const state = {
  current: 0,
  direction: 1,
  data: {
    q64_already_paid: "",
    q54_nombreDe: "1",
    selected_plan: "integral_1eur",
    source: "nomerys_premium_form"
  },
  touched: {},
};

const steps = [
  {
    {
  key: "welcome",
  name: "Départ",
  kicker: "Bienvenue",
  title: "On prépare ton voyage, sans prise de tête.",
  desc: "Réponds à quelques questions simples. Une seule étape à la fois, rien de compliqué.",
  html: () => `
    <div class="choice-grid single-choice">
      ${card("start", "✨", "Commencer ma demande", "Je remplis le formulaire normalement")}
    </div>
  `,
  bind: () => {
    state.data.introChoice = "start";
    bindSingleChoice("introChoice", "start");
    document.querySelector(".choice[data-value='start']")?.classList.add("selected");
  },
  validate: () => true,
  beforeNext: () => {
    state.data.q64_already_paid = "";
  }
},
  {
    key: "identity",
    name: "Contact",
    kicker: "Tes informations",
    title: "Où doit-on envoyer ton résultat ?",
    desc: "Entre ton nom et ton email. On utilisera cette adresse pour t’envoyer ta proposition.",
    html: () => `
      <div class="split">
        ${input("Prénom", "firstName", "text", "Baptiste", "given-name")}
        ${input("Nom", "lastName", "text", "Paixao", "family-name")}
      </div>
      ${input("Email", "q4_email", "email", "ton@email.com", "email")}
    `,
    bind: bindInputs,
    validate: () => {
      if (!val("firstName")) return fail("Entre ton prénom.");
      if (!val("lastName")) return fail("Entre ton nom.");
      if (!isEmail(val("q4_email"))) return fail("Entre une adresse email valide.");
      return true;
    }
  },
  {
    key: "branch",
    name: "Destination",
    kicker: "Destination",
    title: "Tu sais déjà où tu veux partir ?",
    desc: "Cette réponse permet d’adapter le reste du formulaire.",
    html: () => `
      <div class="choice-grid">
        ${card("Oui j'ai déjà une destination", "📍", "Oui j'ai déjà une destination", "Je sais déjà la ville ou la zone")}
        ${card("Non je n'ai pas d'idée", "🧭", "Non je n'ai pas d'idée", "Je veux une proposition selon mes envies")}
      </div>
    `,
    bind: () => bindSingleChoice("q36_avezvousDeja"),
    validate: () => required("q36_avezvousDeja", "Dis-nous si tu as déjà une destination.")
  },
  {
    key: "destination_known",
    name: "Destination",
    show: () => state.data.q36_avezvousDeja === "Oui j'ai déjà une destination",
    kicker: "Ton point d’arrivée",
    title: "Où veux-tu aller ?",
    desc: "Mets la ville, la zone ou le pays. Tu peux aussi ajouter un lieu précis.",
    html: () => `
      ${input("Ville / zone d’arrivée", "q37_q_arrive_city", "text", "Ex : Tokyo, Hanoï, Bali, New York")}
      ${input("Lieu précis à visiter", "q53_lieuPrecis", "text", "Optionnel : Shibuya, Osaka, quartier précis...")}
    `,
    bind: bindInputs,
    validate: () => required("q37_q_arrive_city", "Indique au moins une ville ou une zone d’arrivée.")
  },
  {
    key: "destination_unknown",
    name: "Envies",
    show: () => state.data.q36_avezvousDeja === "Non je n'ai pas d'idée",
    kicker: "Tes envies",
    title: "Quel type de voyage te donne envie ?",
    desc: "Choisis ce qui ressemble le plus à ton mood. Pas besoin d’être trop précis.",
    html: () => `
      ${choiceGroup("Type de destination souhaité", "q56_typeDe", [
        ["Plage", "🏝️", "Mer, soleil, repos"],
        ["Ville", "🌆", "Restaurants, quartiers, énergie"],
        ["Nature", "🏔️", "Paysages, calme, découverte"],
        ["Mix", "🌍", "Un peu de tout"]
      ])}
      ${choiceGroup("Région(s) préférée(s)", "q47_q_regions", [
        ["Europe", "🇪🇺", "Proche et pratique"],
        ["Asie", "🌏", "Dépaysement fort"],
        ["Amérique", "🗽", "Grand voyage"],
        ["Peu importe", "🎲", "Surprends-moi"]
      ])}
    `,
    bind: bindInputsAndChoices,
    validate: () => true
  },
  {
    key: "dates",
    name: "Dates",
    kicker: "Dates",
    title: "Quand veux-tu partir ?",
    desc: "Sélectionne tes dates. On bloque les incohérences pour éviter les erreurs dans le workflow.",
    html: () => `
      <div class="split">
        ${input("Date de départ", "startDateRaw", "date")}
        ${input("Date de retour", "endDateRaw", "date")}
      </div>
    `,
    bind: () => {
      bindInputs();
      const today = new Date();
      today.setDate(today.getDate() + 1);
      const min = toInputDate(today);
      $("input[name='startDateRaw']").setAttribute("min", min);
      $("input[name='endDateRaw']").setAttribute("min", min);
    },
    validate: () => {
      if (!val("startDateRaw")) return fail("Choisis une date de départ.");
      if (!val("endDateRaw")) return fail("Choisis une date de retour.");

      const start = new Date(val("startDateRaw") + "T00:00:00");
      const end = new Date(val("endDateRaw") + "T00:00:00");
      const today = new Date();
      today.setHours(0,0,0,0);

      if (start < today) return fail("La date de départ ne peut pas être dans le passé.");
      if (end <= start) return fail("La date de retour doit être après la date de départ.");

      const days = Math.round((end - start) / 86400000);
      if (days > MAX_TRIP_DAYS) return fail(`Le séjour semble trop long. Maximum conseillé : ${MAX_TRIP_DAYS} jours.`);
      return true;
    }
  },
  {
    key: "travellers",
    name: "Voyageurs",
    kicker: "Voyageurs",
    title: "Combien de personnes partent ?",
    desc: "Indique le nombre de voyageurs, puis l’âge de chacun.",
    html: () => `
      <div class="field">
        <div class="label"><span>Nombre de voyageurs</span><span class="hint">maximum ${MAX_TRAVELLERS}</span></div>
        <div class="counter">
          <button type="button" id="minusTraveller" aria-label="Retirer un voyageur">−</button>
          <div class="counter-value"><span id="travellerCount">${escapeHtml(state.data.q54_nombreDe || "1")}</span></div>
          <button type="button" id="plusTraveller" aria-label="Ajouter un voyageur">+</button>
        </div>
      </div>
      <div class="field">
        <div class="label"><span>Âge des voyageurs</span><span class="hint">1 âge par voyageur</span></div>
        <div id="ageWrap" class="age-wrap"></div>
      </div>
    `,
    bind: bindTravellerControls,
    validate: () => {
      const n = Number(state.data.q54_nombreDe || 0);
      if (!Number.isInteger(n) || n < 1) return fail("Indique au moins 1 voyageur.");
      if (n > MAX_TRAVELLERS) return fail(`Nomerys accepte maximum ${MAX_TRAVELLERS} voyageurs pour l’instant.`);

      const ages = $$(".age-input").map(input => input.value.trim());
      if (ages.length !== n || ages.some(a => !a)) return fail("Il faut exactement un âge par voyageur.");
      if (ages.some(a => Number(a) < 0 || Number(a) > 120)) return fail("Un âge semble incorrect.");

      state.data.q65_ageDe = JSON.stringify(ages.map(age => ({ "Âge": String(Number(age)) })));
      return true;
    }
  },
  {
  key: "mood",
  name: "Style",

  show: () => state.data.q36_avezvousDeja === "Non je n'ai pas d'idée",

  kicker: "Ambiance",
  title: "Quelle ambiance tu veux ?",
  desc: "Choisis rapidement. Tu peux laisser vide si tu es flexible.",

  html: () => `
    ${choiceGroup("Climat souhaité", "q41_q_climate", [
      ["Chaud", "☀️", "Soleil, chaleur"],
      ["Doux", "🌤️", "Tempéré, agréable"],
      ["Froid", "❄️", "Neige, hiver, cozy"],
      ["Peu importe", "🌈", "Flexible"]
    ])}

    ${choiceGroup("Ambiance de voyage", "q48_q_style", [
      ["Relax", "🧘", "Repos, calme"],
      ["Aventure", "🚀", "Découverte, adrénaline"],
      ["Culture", "🏛️", "Musées, monuments"],
      ["Luxe simple", "✨", "Beau, propre, confortable"]
    ])}
  `,

  bind: bindInputsAndChoices,
  validate: () => true
},
  {
    key: "activities",
    name: "Activités",
    kicker: "Détails",
    title: "Tu veux absolument faire quoi ?",
    desc: "Optionnel. Plus tu donnes d’idées, plus la proposition peut être adaptée.",
    html: () => `
      ${textarea("Activités à faire", "q51_activitesA51", "Ex : restaurants locaux, musées, plage, shopping, quartiers animés, lieux Instagram, parcs...")}
    `,
    bind: bindInputs,
    validate: () => true
  },
  {
    key: "plan",
    name: "Plan",
    kicker: "Offre actuelle",
    title: "Dernière étape avant paiement.",
    desc: "Pour l’instant, un seul plan est disponible. Tu pourras ajouter d’autres plans plus tard sans refaire le formulaire.",
    html: () => `
      <div class="plan-card">
        <span class="plan-badge">Offre de lancement</span>
        <div class="price">1€</div>
        <h3>Plan intégral Nomerys</h3>
        <div class="plan-list">
          <div>Proposition de voyage personnalisée</div>
          <div>Vols, hébergements, activités et conseils</div>
          <div>Résultat envoyé clairement par email</div>
          <div>Paiement sécurisé via Stripe</div>
        </div>
      </div>
    `,
    bind: () => {},
    validate: () => true
  },
  {
    key: "review",
    name: "Validation",
    kicker: "Vérification",
    title: "Tout est bon ?",
    desc: "Après validation, tu seras redirigé vers Stripe. Une fois le paiement validé, Nomerys lance la préparation.",
    html: () => `
      <div class="summary-card">
        ${summaryLine("Nom", `${state.data.firstName || ""} ${state.data.lastName || ""}`.trim() || "—")}
        ${summaryLine("Email", state.data.q4_email || "—")}
        ${summaryLine("Destination", state.data.q37_q_arrive_city || (state.data.q36_avezvousDeja === "Non je n'ai pas d'idée" ? "À proposer" : "—"))}
        ${summaryLine("Dates", formatDates() || "—")}
        ${summaryLine("Voyageurs", `${state.data.q54_nombreDe || "1"} personne(s)`)}
        ${summaryLine("Plan", "Plan intégral — 1€")}
      </div>
    `,
    bind: () => {},
    validate: () => true,
    submit: true
  }
];

function visibleSteps(){
  return steps.filter(step => !step.show || step.show());
}

function currentStep(){
  return visibleSteps()[state.current];
}

function renderStep(){
  try {
    hideError();

    const list = visibleSteps();
    if (!list.length) throw new Error("Aucune étape visible");

    if (state.current < 0) state.current = 0;
    if (state.current >= list.length) state.current = list.length - 1;

    const step = currentStep();
    if (!step) throw new Error("Étape introuvable");

    mount.innerHTML = `
      <section class="step" data-key="${step.key}">
        <div class="step-kicker">${step.kicker}</div>
        <h2>${step.title}</h2>
        <p class="step-desc">${step.desc}</p>
        <div class="step-content">${step.html()}</div>
      </section>
    `;

    if (typeof step.bind === "function") step.bind();

    updateUI();
    updateMini();

  } catch (error) {
    console.error("Nomerys render error:", error);

    mount.innerHTML = `
      <section class="step">
        <div class="step-kicker">Bienvenue</div>
        <h2>On prépare ton voyage.</h2>
        <p class="step-desc">
          Le formulaire a eu un petit problème d’affichage. Clique sur le bouton ci-dessous pour le relancer.
        </p>
        <div class="choice-grid single-choice">
          <button type="button" class="choice selected" onclick="location.reload()">
            <span class="choice-icon">🔄</span>
            <strong>Relancer le formulaire</strong>
            <small>Recharge proprement la page</small>
          </button>
        </div>
      </section>
    `;
  }
}

function updateUI(){
  const list = visibleSteps();
  if (state.current >= list.length) state.current = list.length - 1;
  const step = currentStep();
  const pct = Math.round((state.current / (list.length - 1)) * 100);

  $("#sectionName").textContent = step.name;
  $("#progressLabel").textContent = `${pct}%`;
  $("#topProgressFill").style.width = `${pct}%`;
  $("#mobileMini").textContent = `Étape ${state.current + 1} / ${list.length}`;

  backBtn.disabled = state.current === 0;
  nextBtn.querySelector("span").textContent = step.submit
  ? (SKIP_PAYMENT_FOR_TEST ? "Envoyer le test sans paiement" : "Payer 1€ et lancer ma demande")
  : "Continuer";
}

function bindInputs(){
  $$("input, textarea").forEach(el => {
    const name = el.name;
    if (state.data[name] !== undefined && el.value === "") el.value = state.data[name];
    el.addEventListener("input", () => {
      state.data[name] = el.value;
      state.touched[name] = true;
      updateMini();
    });
  });
}

function bindInputsAndChoices(){
  bindInputs();
  $$(".choice[data-name]").forEach(el => {
    const name = el.dataset.name;
    const value = el.dataset.value;
    if (state.data[name] === value) el.classList.add("selected");

    el.addEventListener("click", () => {
      state.data[name] = value;
      state.touched[name] = true;
      $$(`.choice[data-name="${cssEscape(name)}"]`).forEach(c => c.classList.remove("selected"));
      el.classList.add("selected");
      updateMini();
    });
  });
}

function bindSingleChoice(name, defaultValue = null){
  $$(".choice[data-value]").forEach(el => {
    if (state.data[name] === el.dataset.value) el.classList.add("selected");
    el.addEventListener("click", () => {
      state.data[name] = el.dataset.value;
      state.touched[name] = true;
      $$(".choice[data-value]").forEach(c => c.classList.remove("selected"));
      el.classList.add("selected");
      updateMini();
    });
  });

  if (defaultValue && !state.data[name]) {
    // Pas de sélection automatique visuelle : l'utilisateur choisit.
  }
}

function bindTravellerControls(){
  const sync = () => {
    $("#travellerCount").textContent = state.data.q54_nombreDe;
    renderAges();
    updateMini();
  };

  $("#minusTraveller").addEventListener("click", () => {
    const n = Math.max(1, Number(state.data.q54_nombreDe || 1) - 1);
    state.data.q54_nombreDe = String(n);
    sync();
  });

  $("#plusTraveller").addEventListener("click", () => {
    const n = Math.min(MAX_TRAVELLERS, Number(state.data.q54_nombreDe || 1) + 1);
    state.data.q54_nombreDe = String(n);
    sync();
  });

  renderAges();
}

function renderAges(){
  const n = Number(state.data.q54_nombreDe || 1);
  let stored = [];
  try {
    stored = JSON.parse(state.data.q65_ageDe || "[]").map(x => x["Âge"] || "");
  } catch(e) {}

  const currentDom = $$(".age-input").map(i => i.value);
  const ages = currentDom.length ? currentDom : stored;

  $("#ageWrap").innerHTML = Array.from({length:n}, (_,i) => `
    <label class="age-item">
      <span>Voyageur ${i + 1}</span>
      <input class="input age-input" inputmode="numeric" type="number" min="0" max="120" placeholder="Âge" value="${escapeHtml(ages[i] || "")}">
    </label>
  `).join("");

  $$(".age-input").forEach(input => {
    input.addEventListener("input", () => {
      const values = $$(".age-input").map(i => i.value.trim()).filter(Boolean);
      state.data.q65_ageDe = JSON.stringify(values.map(age => ({ "Âge": String(age) })));
    });
  });
}

function next(){
  const step = currentStep();
  collectInputs();

  const valid = step.validate();
  if (valid !== true) {
    showError(valid || "Vérifie les informations.");
    return;
  }

  step.beforeNext?.();

  if (step.submit) {
    submit();
    return;
  }

  state.current += 1;
  normalizeCurrentIndex();
  renderStep();
}

function back(){
  if (state.current > 0) {
    state.current -= 1;
    renderStep();
  }
}

function normalizeCurrentIndex(){
  const list = visibleSteps();
  if (state.current > list.length - 1) state.current = list.length - 1;
}

function collectInputs(){
  $$("input, textarea").forEach(el => {
    if (el.name) state.data[el.name] = el.value.trim();
  });
}

function buildPayload(){
  const start = splitDate(state.data.startDateRaw);
  const end = splitDate(state.data.endDateRaw);

  return {
    q3_nom: {
      first: state.data.firstName || "",
      last: state.data.lastName || ""
    },
    q4_email: state.data.q4_email || "",
    q36_avezvousDeja: state.data.q36_avezvousDeja || "",
    q54_nombreDe: state.data.q54_nombreDe || "",
    q65_ageDe: state.data.q65_ageDe || "",
    q37_q_arrive_city: state.data.q37_q_arrive_city || "",
    q38_q_date_start: start,
    q39_q_date_end: end,
    q53_lieuPrecis: state.data.q53_lieuPrecis || "",
    q41_q_climate: state.data.q41_q_climate || "",
    q47_q_regions: state.data.q47_q_regions || "",
    q48_q_style: state.data.q48_q_style || "",
    q56_typeDe: state.data.q56_typeDe || "",
    q51_activitesA51: state.data.q51_activitesA51 || "",
    q64_already_paid: state.data.q64_already_paid || "",

    selected_plan: "integral_1eur",
    source: "nomerys_premium_form",
    submitSource: "custom_form",
    submitDate: new Date().toISOString(),

    // Utile pour retrouver la demande avant/après paiement côté n8n
    request_id: cryptoRandomId()
  };
}

async function submit(){
  showLoading(true);

  try{
    const payload = buildPayload();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(WEBHOOK_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(payload),
      signal:controller.signal
    });

    clearTimeout(timeout);

    const raw = await response.text();
    let data = {};
    try { data = JSON.parse(raw); } catch(e) {}

    if (!response.ok) {
      throw new Error(raw || `Erreur n8n ${response.status}`);
    }

   const checkoutUrl = data.checkout_url || data.checkoutUrl || data.url;

if (SKIP_PAYMENT_FOR_TEST) {
  showLoading(false);
  showToast("Mode test : formulaire envoyé à n8n sans paiement Stripe.");
  return;
}

if (!checkoutUrl || !/^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl)) {
  showLoading(false);
  showToast("n8n a reçu le formulaire, mais n’a pas renvoyé d’URL Stripe valide. Il faut répondre avec checkout_url.");
  return;
}

window.location.assign(checkoutUrl);
  }catch(error){
    showLoading(false);
    if (error.name === "AbortError") {
      showToast("La connexion prend trop de temps. Vérifie que le webhook n8n répond bien.");
    } else {
      showToast("Impossible d’envoyer le formulaire. Vérifie le webhook n8n, le mode Production et le CORS.");
      console.error(error);
    }
  }
}

function card(value, icon, title, desc){
  return `
    <button type="button" class="choice" data-value="${escapeHtml(value)}">
      <span class="choice-icon">${icon}</span>
      <strong>${title}</strong>
      <small>${desc}</small>
    </button>
  `;
}

function choiceGroup(label, name, items){
  return `
    <div class="field">
      <div class="label"><span>${label}</span><span class="hint">optionnel</span></div>
      <div class="choice-grid">
        ${items.map(([value, icon, desc]) => `
          <button type="button" class="choice" data-name="${escapeHtml(name)}" data-value="${escapeHtml(value)}">
            <span class="choice-icon">${icon}</span>
            <strong>${value}</strong>
            <small>${desc}</small>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function input(label, name, type = "text", placeholder = "", autocomplete = ""){
  const value = state.data[name] || "";
  return `
    <label class="field">
      <span class="label"><span>${label}</span></span>
      <input class="input" name="${escapeHtml(name)}" type="${type}" placeholder="${escapeHtml(placeholder)}" autocomplete="${autocomplete}" value="${escapeHtml(value)}">
    </label>
  `;
}

function textarea(label, name, placeholder = ""){
  return `
    <label class="field">
      <span class="label"><span>${label}</span><span class="hint">optionnel</span></span>
      <textarea class="textarea" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(state.data[name] || "")}</textarea>
    </label>
  `;
}

function summaryLine(label, value){
  return `<div class="summary-line"><span>${label}</span><b>${escapeHtml(value)}</b></div>`;
}

function val(name){
  const el = $(`[name="${cssEscape(name)}"]`);
  return (el ? el.value : state.data[name] || "").trim();
}

function required(name, message){
  return state.data[name] ? true : fail(message);
}

function fail(message){ return message; }

function showError(message){
  errorText.textContent = message;
  errorBox.classList.add("show");
  errorBox.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function hideError(){
  errorBox.classList.remove("show");
  errorText.textContent = "";
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 6500);
}

function showLoading(show){
  const screen = $("#loadingScreen");
  screen.classList.toggle("show", show);
  screen.setAttribute("aria-hidden", show ? "false" : "true");
}

function updateMini(){
  const destination = state.data.q37_q_arrive_city || (
    state.data.q36_avezvousDeja === "Non je n'ai pas d'idée" ? "À proposer" : "À définir"
  );

  $("#miniDestination").textContent = destination;
  $("#miniDates").textContent = formatDates() || "—";
  $("#miniTravellers").textContent = state.data.q54_nombreDe ? `${state.data.q54_nombreDe} personne(s)` : "—";
  $("#passStatus").textContent = currentStep()?.name || "En préparation";

  const miniStatus = $("#miniStatus");
  if (miniStatus) miniStatus.textContent = currentStep()?.submit ? "Prête" : "En cours";

  updateGlobeRoute(destination);
}

function updateGlobeRoute(destination){
  const plane = $("#planeIcon");
  const pin = $("#destinationPin");
  const globeStage = $("#globeStage");

  if (!plane || !pin || !globeStage) return;

  const hasKnownDestination =
    state.data.q36_avezvousDeja === "Oui j'ai déjà une destination" &&
    destination &&
    destination !== "À définir";

  if (!hasKnownDestination) {
    plane.classList.remove("landed");
    pin.classList.remove("active");
    globeStage.dataset.destination = "unknown";
    return;
  }

  const clean = destination.toLowerCase();

  let destKey = "generic";
  if (clean.includes("tokyo") || clean.includes("japon")) destKey = "tokyo";
  if (clean.includes("phuket") || clean.includes("thailande") || clean.includes("thaïlande")) destKey = "phuket";
  if (clean.includes("bali")) destKey = "bali";
  if (clean.includes("new york")) destKey = "newyork";
  if (clean.includes("hanoi") || clean.includes("hanoï") || clean.includes("vietnam")) destKey = "hanoi";
  if (clean.includes("paris")) destKey = "paris";

  globeStage.dataset.destination = destKey;
  plane.classList.add("landed");
  pin.classList.add("active");
}

function formatDates(){
  if (!state.data.startDateRaw || !state.data.endDateRaw) return "";
  return `${formatFrenchDate(state.data.startDateRaw)} → ${formatFrenchDate(state.data.endDateRaw)}`;
}

function formatFrenchDate(date){
  const [y,m,d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function splitDate(raw){
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { day:"", month:"", year:"" };
  const [year, month, day] = raw.split("-");
  return { day, month, year };
}

function isEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function toInputDate(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}

function cssEscape(value){
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function cryptoRandomId(){
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

nextBtn.addEventListener("click", next);
backBtn.addEventListener("click", back);

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const active = document.activeElement;
    if (active && active.tagName === "TEXTAREA") return;
    event.preventDefault();
    next();
  }
});

function bootNomerys(){
  try {
    renderStep();

    setTimeout(() => {
      if (!mount || mount.innerHTML.trim() === "") {
        console.warn("Nomerys empty mount detected. Re-rendering...");
        renderStep();
      }
    }, 300);

    setTimeout(() => {
      if (!mount || mount.innerHTML.trim() === "") {
        console.warn("Nomerys second empty mount detected. Showing fallback...");
        mount.innerHTML = `
          <section class="step">
            <div class="step-kicker">Bienvenue</div>
            <h2>Commence ta demande.</h2>
            <p class="step-desc">Recharge la page si le formulaire ne s’affiche pas correctement.</p>
          </section>
        `;
      }
    }, 1200);

  } catch (error) {
    console.error("Nomerys boot error:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootNomerys);
} else {
  bootNomerys();
}
