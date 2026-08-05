/*
  NOMERYS PREMIUM FORM
  ---------------------------------------------------
  Front-end GitHub Pages compatible.
  Aucun secret Stripe ici.
  Le webhook n8n doit créer Stripe Checkout et renvoyer :
  { "checkout_url": "https://checkout.stripe.com/..." }

    Champs du formulaire :
  q3_nom, q4_email, q36_avezvousDeja, q66_niveauConfort, q54_nombreDe, q65_ageDe,
  q68_aeroportDepart, q37_q_arrive_city, q67_villeZoneArrivee,
  q38_q_date_start, q39_q_date_end, q53_lieuPrecis,
  q41_q_climate, q47_q_regions, q48_q_style, q56_typeDe,
  q51_activitesA51, q64_already_paid
*/

const DEV_MODE = false; // true = webhook-test | false = webhook production

const WEBHOOK_URL = DEV_MODE
  ? "https://baptistepaixao2.app.n8n.cloud/webhook-test/voyage-form"
  : "https://baptistepaixao2.app.n8n.cloud/webhook/voyage-form";

const SKIP_PAYMENT_FOR_TEST = false;

const MAX_TRAVELLERS = 10;
const MAX_TRIP_DAYS = 45;

/* =========================================================
   GOOGLE ANALYTICS 4 + MICROSOFT CLARITY
   ========================================================= */

const NOMERYS_TRACKING = {
  formStarted: false,
  lastStepViewed: "",
  sessionId: cryptoRandomId(),
  pageLoadedAt: Date.now()
};

/**
 * Envoie un événement à Google Analytics 4 et Microsoft Clarity.
 *
 * Aucune donnée personnelle ne doit être envoyée ici :
 * pas de nom, prénom, email, âge précis ou texte libre.
 */
function trackNomerysEvent(eventName, parameters = {}) {
  const safeParameters = {
    form_name: "nomerys_premium_form",
    form_version: "v12",
    tracking_session_id: NOMERYS_TRACKING.sessionId,
    ...parameters
  };

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, safeParameters);
    }
  } catch (error) {
    console.warn("Nomerys GA4 tracking error:", error);
  }

  try {
    if (typeof window.clarity === "function") {
      window.clarity("event", eventName);
    }
  } catch (error) {
    console.warn("Nomerys Clarity tracking error:", error);
  }

  if (DEV_MODE) {
    console.log("[Nomerys tracking]", eventName, safeParameters);
  }
}

function markFormStarted(trigger = "interaction") {
  if (NOMERYS_TRACKING.formStarted) return;

  NOMERYS_TRACKING.formStarted = true;

  trackNomerysEvent("form_start", {
    start_trigger: trigger
  });
}

function trackCurrentStepView() {
  const step = currentStep();
  const list = visibleSteps();

  if (!step || !list.length) return;

  const stepIdentifier = `${state.current + 1}:${step.key}`;

  if (NOMERYS_TRACKING.lastStepViewed === stepIdentifier) return;

  NOMERYS_TRACKING.lastStepViewed = stepIdentifier;

  trackNomerysEvent("form_step_view", {
    step_key: step.key,
    step_name: step.name,
    step_number: state.current + 1,
    total_steps: list.length,
    progress_percent: Math.round(
      (state.current / Math.max(list.length - 1, 1)) * 100
    )
  });
}

function trackChoiceSelection(fieldName, selectedValue) {
  const genericParameters = {
    field_name: fieldName,
    selected_value: selectedValue
  };

  trackNomerysEvent("form_choice_selected", genericParameters);

  if (fieldName === "q36_avezvousDeja") {
    trackNomerysEvent("destination_preference_selected", {
      destination_known:
        selectedValue === "Oui j'ai déjà une destination" ? "yes" : "no"
    });
  }

  if (fieldName === "q66_niveauConfort") {
    trackNomerysEvent("comfort_selected", {
      comfort_level: selectedValue
    });
  }
}

function getTrackingErrorType(message = "") {
  const normalized = String(message).toLowerCase();

  if (normalized.includes("email")) return "invalid_email";
  if (normalized.includes("date")) return "invalid_dates";
  if (normalized.includes("voyageur")) return "invalid_travellers";
  if (normalized.includes("destination")) return "missing_destination";
  if (normalized.includes("confort")) return "missing_comfort";
  if (normalized.includes("âge") || normalized.includes("age")) {
    return "invalid_ages";
  }

  return "validation_error";
}

function getAttributionData() {
  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    ttclid: params.get("ttclid") || "",
    landing_page: window.location.pathname,
    referrer_domain: getReferrerDomain()
  };
}

function getReferrerDomain() {
  try {
    if (!document.referrer) return "";
    return new URL(document.referrer).hostname;
  } catch (error) {
    return "";
  }
}

function maskSensitiveFieldsForClarity() {
  const sensitiveSelectors = [
    "[name='firstName']",
    "[name='lastName']",
    "[name='q4_email']",
    "[name='q68_aeroportDepart']",
    "[name='q37_q_arrive_city']",
    "[name='q67_villeZoneArrivee']",
    "[name='q53_lieuPrecis']",
    "[name='q51_activitesA51']",
    ".summary-card"
  ];

  sensitiveSelectors.forEach(selector => {
    $$(selector).forEach(element => {
      element.setAttribute("data-clarity-mask", "true");
    });
  });
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector)
];

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
  touched: {}
};

const steps = [
  {
    key: "welcome",
    name: "Départ",
    kicker: "Bienvenue",
    title: "Ton prochain voyage. Pensé pour toi.",
    desc:
      "Décris simplement tes envies. Notre IA construit un voyage personnalisé, prêt à réserver, en comparant les meilleures options pour toi selon ton niveau de confort.",
    html: () => `
      <div class="choice-grid single-choice">
        ${card(
          "start",
          "✨",
          "Commencer ma demande",
          "Je remplis le formulaire normalement"
        )}
      </div>
    `,
    bind: () => {
      state.data.introChoice = "start";
      bindSingleChoice("introChoice", "start");

      document
        .querySelector(".choice[data-value='start']")
        ?.classList.add("selected");
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
    desc:
      "Entre ton nom et ton email. On utilisera cette adresse pour t’envoyer ta proposition.",
    html: () => `
      <div class="split">
        ${input(
          "Prénom",
          "firstName",
          "text",
          "Baptiste",
          "given-name"
        )}

        ${input(
          "Nom",
          "lastName",
          "text",
          "Paixao",
          "family-name"
        )}
      </div>

      ${input(
        "Email",
        "q4_email",
        "email",
        "ton@email.com",
        "email"
      )}
    `,
    bind: bindInputs,
    validate: () => {
      if (!val("firstName")) return fail("Entre ton prénom.");
      if (!val("lastName")) return fail("Entre ton nom.");

      if (!isEmail(val("q4_email"))) {
        return fail("Entre une adresse email valide.");
      }

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
        ${card(
          "Oui j'ai déjà une destination",
          "📍",
          "Oui j'ai déjà une destination",
          "Je sais déjà la ville ou la zone"
        )}

        ${card(
          "Non je n'ai pas d'idée",
          "🧭",
          "Non je n'ai pas d'idée",
          "Je veux une proposition selon mes envies"
        )}
      </div>
    `,
    bind: () => bindSingleChoice("q36_avezvousDeja"),
    validate: () =>
      required(
        "q36_avezvousDeja",
        "Dis-nous si tu as déjà une destination."
      )
  },
   {
    key: "departure_airport",
    name: "Départ",
    kicker: "Ton point de départ",
    title: "D’où veux-tu partir ?",

    desc:
      "Indique une ville ou un aéroport. Nomerys pourra ensuite comparer les départs les plus pertinents autour de ce point.",

    html: () => `
      ${input(
        "Aéroport ou ville de départ",
        "q68_aeroportDepart",
        "text",
        "Ex : Lille, Paris-CDG, Bruxelles, Lyon..."
      )}
    `,

    bind: bindInputs,

    validate: () =>
      required(
        "q68_aeroportDepart",
        "Indique ta ville ou ton aéroport de départ."
      )
  },
  {
    key: "comfort_level",
    name: "Confort",
    kicker: "Niveau de confort",
    title: "Quel niveau de confort souhaites-tu ?",
    desc:
      "Cela nous permet de choisir des hébergements réellement adaptés à ta façon de voyager.",

    html: () => `
      <div class="choice-grid comfort-grid">

        <button
          type="button"
          class="choice comfort-choice"
          data-name="q66_niveauConfort"
          data-value="backpacking"
        >
          <span class="choice-icon">🎒</span>

          <span class="comfort-heading">
            <strong>Low-cost / backpacking</strong>
            <span class="comfort-badge">Budget minimum</span>
          </span>

          <small>
            Auberges, dortoirs, chambres partagées et solutions très économiques
            peuvent être proposées.
          </small>

          <span class="comfort-details">
            Idéal pour voyager au prix le plus bas possible.
          </span>
        </button>

        <button
          type="button"
          class="choice comfort-choice"
          data-name="q66_niveauConfort"
          data-value="comfort"
        >
          <span class="choice-icon">🛏️</span>

          <span class="comfort-heading">
            <strong>Confort</strong>
            <span class="comfort-badge recommended">Recommandé</span>
          </span>

          <small>
            Chambre ou logement privé, salle de bain privée, bonnes évaluations
            et emplacement pratique.
          </small>

          <span class="comfort-details">
            Le meilleur équilibre entre prix et qualité.
          </span>
        </button>

        <button
          type="button"
          class="choice comfort-choice"
          data-name="q66_niveauConfort"
          data-value="luxury"
        >
          <span class="choice-icon">✨</span>

          <span class="comfort-heading">
            <strong>Luxe</strong>
            <span class="comfort-badge">Expérience premium</span>
          </span>

          <small>
            Hôtels 4 ou 5 étoiles, établissements haut de gamme et services
            premium.
          </small>

          <span class="comfort-details">
            Priorité au confort, au service et à l’expérience.
          </span>
        </button>

      </div>

      <div class="comfort-note">
        Tu pourras toujours comparer plusieurs prix dans le guide final.
      </div>
    `,

    bind: bindInputsAndChoices,

    validate: () =>
      required(
        "q66_niveauConfort",
        "Choisis le niveau de confort souhaité pour ton voyage."
      )
  },
    {
    key: "destination_known",
    name: "Destination",

    show: () =>
      state.data.q36_avezvousDeja ===
      "Oui j'ai déjà une destination",

    kicker: "Ton point d’arrivée",
    title: "Où veux-tu aller ?",

    desc:
      "Indique d’abord le pays. Tu peux ensuite préciser une ville, une île ou une région.",

    html: () => `
      ${input(
        "Pays d’arrivée",
        "q37_q_arrive_city",
        "text",
        "Ex : Japon, Portugal, Thaïlande, États-Unis..."
      )}

      ${input(
        "Ville / île / région souhaitée",
        "q67_villeZoneArrivee",
        "text",
        "Optionnel : Tokyo, Algarve, Bali, Cyclades..."
      )}
    `,

    bind: bindInputs,

    validate: () =>
      required(
        "q37_q_arrive_city",
        "Indique le pays d’arrivée."
      )
  },
  {
    key: "destination_unknown",
    name: "Envies",

    show: () =>
      state.data.q36_avezvousDeja ===
      "Non je n'ai pas d'idée",

    kicker: "Tes envies",
    title: "Quel type de voyage te donne envie ?",

    desc:
      "Choisis ce qui ressemble le plus à ton mood. Pas besoin d’être trop précis.",

    html: () => `
      ${choiceGroup(
        "Type de destination souhaité",
        "q56_typeDe",
        [
          ["Plage", "🏝️", "Mer, soleil, repos"],
          ["Ville", "🌆", "Restaurants, quartiers, énergie"],
          ["Nature", "🏔️", "Paysages, calme, découverte"],
          ["Mix", "🌍", "Un peu de tout"]
        ]
      )}

      ${choiceGroup(
        "Région(s) préférée(s)",
        "q47_q_regions",
        [
          ["Europe", "🇪🇺", "Proche et pratique"],
          ["Asie", "🌏", "Dépaysement fort"],
          ["Amérique", "🗽", "Grand voyage"],
          ["Peu importe", "🎲", "Surprends-moi"]
        ]
      )}
    `,

    bind: bindInputsAndChoices,
    validate: () => true
  },
  {
    key: "dates",
    name: "Dates",
    kicker: "Dates",
    title: "Quand veux-tu partir ?",

    desc:
      "Sélectionne tes dates. On bloque les incohérences pour éviter les erreurs dans le workflow.",

    html: () => `
      <div class="split">
        ${input(
          "Date de départ",
          "startDateRaw",
          "date"
        )}

        ${input(
          "Date de retour",
          "endDateRaw",
          "date"
        )}
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
      if (!val("startDateRaw")) {
        return fail("Choisis une date de départ.");
      }

      if (!val("endDateRaw")) {
        return fail("Choisis une date de retour.");
      }

      const start = new Date(
        val("startDateRaw") + "T00:00:00"
      );

      const end = new Date(
        val("endDateRaw") + "T00:00:00"
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        return fail(
          "La date de départ ne peut pas être dans le passé."
        );
      }

      if (end <= start) {
        return fail(
          "La date de retour doit être après la date de départ."
        );
      }

      const days = Math.round(
        (end - start) / 86400000
      );

      if (days > MAX_TRIP_DAYS) {
        return fail(
          `Le séjour semble trop long. Maximum conseillé : ${MAX_TRIP_DAYS} jours.`
        );
      }

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
        <div class="label">
          <span>Nombre de voyageurs</span>
          <span class="hint">
            maximum ${MAX_TRAVELLERS}
          </span>
        </div>

        <div class="counter">
          <button
            type="button"
            id="minusTraveller"
            aria-label="Retirer un voyageur"
          >
            −
          </button>

          <div class="counter-value">
            <span id="travellerCount">
              ${escapeHtml(
                state.data.q54_nombreDe || "1"
              )}
            </span>
          </div>

          <button
            type="button"
            id="plusTraveller"
            aria-label="Ajouter un voyageur"
          >
            +
          </button>
        </div>
      </div>

      <div class="field">
        <div class="label">
          <span>Âge des voyageurs</span>
          <span class="hint">
            1 âge par voyageur
          </span>
        </div>

        <div
          id="ageWrap"
          class="age-wrap"
          data-clarity-mask="true"
        ></div>
      </div>
    `,

    bind: bindTravellerControls,

    validate: () => {
      const n = Number(
        state.data.q54_nombreDe || 0
      );

      if (!Number.isInteger(n) || n < 1) {
        return fail(
          "Indique au moins 1 voyageur."
        );
      }

      if (n > MAX_TRAVELLERS) {
        return fail(
          `Nomerys accepte maximum ${MAX_TRAVELLERS} voyageurs pour l’instant.`
        );
      }

      const ages = $$(".age-input").map(input =>
        input.value.trim()
      );

      if (
        ages.length !== n ||
        ages.some(age => !age)
      ) {
        return fail(
          "Il faut exactement un âge par voyageur."
        );
      }

      if (
        ages.some(
          age =>
            Number(age) < 0 ||
            Number(age) > 120
        )
      ) {
        return fail(
          "Un âge semble incorrect."
        );
      }

      state.data.q65_ageDe = JSON.stringify(
        ages.map(age => ({
          "Âge": String(Number(age))
        }))
      );

      return true;
    }
  },

    {
    key: "mood",
    name: "Style",

    show: () =>
      state.data.q36_avezvousDeja ===
      "Non je n'ai pas d'idée",

    kicker: "Ambiance",
    title: "Quelle ambiance tu veux ?",

    desc:
      "Choisis rapidement. Tu peux laisser vide si tu es flexible.",

    html: () => `
      ${choiceGroup(
        "Climat souhaité",
        "q41_q_climate",
        [
          ["Chaud", "☀️", "Soleil, chaleur"],
          ["Doux", "🌤️", "Tempéré, agréable"],
          ["Froid", "❄️", "Neige, hiver, cozy"],
          ["Peu importe", "🌈", "Flexible"]
        ]
      )}

      ${choiceGroup(
        "Ambiance de voyage",
        "q48_q_style",
        [
          ["Relax", "🧘", "Repos, calme"],
          ["Aventure", "🚀", "Découverte, adrénaline"],
          ["Culture", "🏛️", "Musées, monuments"],
          ["Luxe simple", "✨", "Beau, propre, confortable"]
        ]
      )}
    `,

    bind: bindInputsAndChoices,
    validate: () => true
  },
    {
    key: "activities",
    name: "Activités",
    kicker: "Détails",
    title: "Tu veux absolument faire quoi ?",

    desc:
      "Optionnel. Plus tu donnes d’idées, plus la proposition peut être adaptée.",

    html: () => `
      ${input(
  "Lieu précis à visiter (optionnel)",
  "q53_lieuPrecis",
  "text",
  "Ex : musée, monument, temple, quartier ou autre ville..."
)}

${textarea(
  "Activités à faire (optionnel)",
  "q51_activitesA51",
  "Ex : restaurants locaux, musées, plage, shopping, quartiers animés, lieux Instagram, parcs..."
)}
    `,

    bind: bindInputs,
    validate: () => true
  },
  {
    key: "plan",
    name: "Plan",
    kicker: "Offre actuelle",
    title: "Dernière étape avant paiement.",

    desc:
      "Pour l’instant, un seul plan est disponible. Tu pourras ajouter d’autres plans plus tard sans refaire le formulaire.",

    html: () => `
      <div class="plan-card">
        <span class="plan-badge">
          Offre de lancement
        </span>

        <div class="price">
          1€
        </div>

        <h3>
          Plan intégral Nomerys
        </h3>

        <div class="plan-list">
          <div>
            Proposition de voyage personnalisée
          </div>

          <div>
            Vols, hébergements, activités et conseils
          </div>

          <div>
            Résultat envoyé clairement par email
          </div>

          <div>
            Paiement sécurisé via Stripe
          </div>
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

    desc:
      "Après validation, tu seras redirigé vers Stripe. Une fois le paiement validé, Nomerys lance la préparation.",

    html: () => `
      <div
        class="summary-card"
        data-clarity-mask="true"
      >
        ${summaryLine(
          "Nom",
          `${state.data.firstName || ""} ${
            state.data.lastName || ""
          }`.trim() || "—"
        )}

        ${summaryLine(
          "Email",
          state.data.q4_email || "—"
        )}

                ${summaryLine(
          "Départ",
          state.data.q68_aeroportDepart || "—"
        )}

        ${summaryLine(
          "Destination",
          state.data.q37_q_arrive_city
            ? [
                state.data.q37_q_arrive_city,
                state.data.q67_villeZoneArrivee
              ]
                .filter(Boolean)
                .join(" — ")
            : (
                state.data.q36_avezvousDeja ===
                "Non je n'ai pas d'idée"
                  ? "À proposer"
                  : "—"
              )
        )}

        ${summaryLine(
          "Dates",
          formatDates() || "—"
        )}

        ${summaryLine(
          "Voyageurs",
          `${
            state.data.q54_nombreDe || "1"
          } personne(s)`
        )}

        ${summaryLine(
          "Plan",
          "Plan intégral — 1€"
        )}
      </div>
    `,

    bind: () => {},
    validate: () => true,
    submit: true
  }
];

function visibleSteps() {
  return steps.filter(
    step => !step.show || step.show()
  );
}

function currentStep() {
  return visibleSteps()[state.current];
}

function renderStep() {
  try {
    hideError();

    const list = visibleSteps();

    if (!list.length) {
      throw new Error(
        "Aucune étape visible"
      );
    }

    if (state.current < 0) {
      state.current = 0;
    }

    if (state.current >= list.length) {
      state.current = list.length - 1;
    }

    const step = currentStep();

    if (!step) {
      throw new Error(
        "Étape introuvable"
      );
    }

    mount.innerHTML = `
      <section
        class="step"
        data-key="${step.key}"
      >
        <div class="step-kicker">
          ${step.kicker}
        </div>

        <h2>
          ${step.title}
        </h2>

        <p class="step-desc">
          ${step.desc}
        </p>

        <div class="step-content">
          ${step.html()}
        </div>
      </section>
    `;

    if (
      typeof step.bind === "function"
    ) {
      step.bind();
    }

    maskSensitiveFieldsForClarity();
    updateUI();
    updateMini();
    trackCurrentStepView();

  } catch (error) {
    console.error(
      "Nomerys render error:",
      error
    );

    trackNomerysEvent(
      "form_error",
      {
        error_type: "render_error"
      }
    );

    mount.innerHTML = `
      <section class="step">
        <div class="step-kicker">
          Bienvenue
        </div>

        <h2>
          On prépare ton voyage.
        </h2>

        <p class="step-desc">
          Le formulaire a eu un petit problème d’affichage.
          Clique sur le bouton ci-dessous pour le relancer.
        </p>

        <div class="choice-grid single-choice">
          <button
            type="button"
            class="choice selected"
            onclick="location.reload()"
          >
            <span class="choice-icon">
              🔄
            </span>

            <strong>
              Relancer le formulaire
            </strong>

            <small>
              Recharge proprement la page
            </small>
          </button>
        </div>
      </section>
    `;
  }
}

function updateUI() {
  const list = visibleSteps();

  if (state.current >= list.length) {
    state.current = list.length - 1;
  }

  const step = currentStep();

  const pct = Math.round(
    (
      state.current /
      Math.max(list.length - 1, 1)
    ) * 100
  );

  $("#sectionName").textContent =
    step.name;

  $("#progressLabel").textContent =
    `${pct}%`;

  $("#topProgressFill").style.width =
    `${pct}%`;

  $("#mobileMini").textContent =
    `Étape ${state.current + 1} / ${list.length}`;

  backBtn.disabled =
    state.current === 0;

  nextBtn
    .querySelector("span")
    .textContent = step.submit
      ? (
          SKIP_PAYMENT_FOR_TEST
            ? "Envoyer le test sans paiement"
            : "Payer 1€ et lancer ma demande"
        )
      : "Continuer";
}

function bindInputs() {
  $$("input, textarea").forEach(el => {
    const name = el.name;

    if (
      state.data[name] !== undefined &&
      el.value === ""
    ) {
      el.value = state.data[name];
    }

    el.addEventListener(
      "input",
      () => {
        markFormStarted(
          "input"
        );

        state.data[name] =
          el.value;

        state.touched[name] =
          true;

        updateMini();
      }
    );
  });

  maskSensitiveFieldsForClarity();
}

function bindInputsAndChoices() {
  bindInputs();

  $$(".choice[data-name]").forEach(
    el => {
      const name =
        el.dataset.name;

      const value =
        el.dataset.value;

      if (
        state.data[name] === value
      ) {
        el.classList.add(
          "selected"
        );
      }

      el.addEventListener(
        "click",
        () => {
          markFormStarted(
            "choice"
          );

          state.data[name] =
            value;

          state.touched[name] =
            true;

          $$(
            `.choice[data-name="${cssEscape(
              name
            )}"]`
          ).forEach(choice => {
            choice.classList.remove(
              "selected"
            );
          });

          el.classList.add(
            "selected"
          );

          trackChoiceSelection(
            name,
            value
          );

          updateMini();
        }
      );
    }
  );
}

function bindSingleChoice(
  name,
  defaultValue = null
) {
  $$(".choice[data-value]").forEach(
    el => {
      if (
        state.data[name] ===
        el.dataset.value
      ) {
        el.classList.add(
          "selected"
        );
      }

      el.addEventListener(
        "click",
        () => {
          markFormStarted(
            "choice"
          );

          state.data[name] =
            el.dataset.value;

          state.touched[name] =
            true;

          $$(".choice[data-value]")
            .forEach(choice => {
              choice.classList.remove(
                "selected"
              );
            });

          el.classList.add(
            "selected"
          );

          trackChoiceSelection(
            name,
            el.dataset.value
          );

          updateMini();
        }
      );
    }
  );

  if (
    defaultValue &&
    !state.data[name]
  ) {
    // Aucune sélection forcée.
  }
}

function bindTravellerControls() {
  const sync = () => {
    $("#travellerCount")
      .textContent =
      state.data.q54_nombreDe;

    renderAges();
    updateMini();

    trackNomerysEvent(
      "travellers_changed",
      {
        traveller_count:
          Number(
            state.data.q54_nombreDe
          )
      }
    );
  };

  $("#minusTraveller")
    .addEventListener(
      "click",
      () => {
        markFormStarted(
          "traveller_counter"
        );

        const n = Math.max(
          1,
          Number(
            state.data.q54_nombreDe ||
            1
          ) - 1
        );

        state.data.q54_nombreDe =
          String(n);

        sync();
      }
    );

  $("#plusTraveller")
    .addEventListener(
      "click",
      () => {
        markFormStarted(
          "traveller_counter"
        );

        const n = Math.min(
          MAX_TRAVELLERS,
          Number(
            state.data.q54_nombreDe ||
            1
          ) + 1
        );

        state.data.q54_nombreDe =
          String(n);

        sync();
      }
    );

  renderAges();
}

function renderAges() {
  const n = Number(
    state.data.q54_nombreDe || 1
  );

  let stored = [];

  try {
    stored = JSON.parse(
      state.data.q65_ageDe || "[]"
    ).map(
      item =>
        item["Âge"] || ""
    );
  } catch (error) {
    stored = [];
  }

  const currentDom =
    $$(".age-input").map(
      input => input.value
    );

  const ages =
    currentDom.length
      ? currentDom
      : stored;

  $("#ageWrap").innerHTML =
    Array.from(
      { length: n },
      (_, index) => `
        <label
          class="age-item"
          data-clarity-mask="true"
        >
          <span>
            Voyageur ${index + 1}
          </span>

          <input
            class="input age-input"
            inputmode="numeric"
            type="number"
            min="0"
            max="120"
            placeholder="Âge"
            data-clarity-mask="true"
            value="${escapeHtml(
              ages[index] || ""
            )}"
          >
        </label>
      `
    ).join("");

  $$(".age-input").forEach(
    input => {
      input.addEventListener(
        "input",
        () => {
          markFormStarted(
            "traveller_age"
          );

          const values =
            $$(".age-input")
              .map(
                ageInput =>
                  ageInput.value.trim()
              )
              .filter(Boolean);

          state.data.q65_ageDe =
            JSON.stringify(
              values.map(age => ({
                "Âge": String(age)
              }))
            );
        }
      );
    }
  );
}

function next() {
  const step = currentStep();

  markFormStarted(
    "next_button"
  );

  collectInputs();

  const valid =
    step.validate();

  if (valid !== true) {
    const message =
      valid ||
      "Vérifie les informations.";

    showError(message);

    trackNomerysEvent(
      "form_error",
      {
        step_key:
          step.key,

        step_number:
          state.current + 1,

        error_type:
          getTrackingErrorType(
            message
          )
      }
    );

    return;
  }

  trackNomerysEvent(
    "form_step_completed",
    {
      step_key:
        step.key,

      step_name:
        step.name,

      step_number:
        state.current + 1,

      total_steps:
        visibleSteps().length
    }
  );

  step.beforeNext?.();

  if (step.submit) {
    submit();
    return;
  }

  state.current += 1;

  normalizeCurrentIndex();
  renderStep();
}

function back() {
  if (state.current > 0) {
    const previousStep =
      currentStep();

    trackNomerysEvent(
      "form_back_click",
      {
        from_step_key:
          previousStep?.key || "",

        from_step_number:
          state.current + 1
      }
    );

    state.current -= 1;
    renderStep();
  }
}

function normalizeCurrentIndex() {
  const list = visibleSteps();

  if (
    state.current >
    list.length - 1
  ) {
    state.current =
      list.length - 1;
  }
}

function collectInputs() {
  $$("input, textarea")
    .forEach(el => {
      if (el.name) {
        state.data[el.name] =
          el.value.trim();
      }
    });
}

function buildPayload() {
  const start =
    splitDate(
      state.data.startDateRaw
    );

  const end =
    splitDate(
      state.data.endDateRaw
    );

  return {
    q3_nom: {
      first:
        state.data.firstName ||
        "",

      last:
        state.data.lastName ||
        ""
    },

    q4_email:
      state.data.q4_email ||
      "",

    q36_avezvousDeja:
      state.data.q36_avezvousDeja ||
      "",

        q68_aeroportDepart:
      state.data.q68_aeroportDepart ||
      "",

    q66_niveauConfort:
      state.data.q66_niveauConfort ||
      "",

    q54_nombreDe:
      state.data.q54_nombreDe ||
      "",

    q65_ageDe:
      state.data.q65_ageDe ||
      "",

    q37_q_arrive_city:
      state.data.q37_q_arrive_city ||
      "",

        q67_villeZoneArrivee:
      state.data.q67_villeZoneArrivee ||
      "",

    q38_q_date_start:
      start,

    q39_q_date_end:
      end,

    q53_lieuPrecis:
      state.data.q53_lieuPrecis ||
      "",

    q41_q_climate:
      state.data.q41_q_climate ||
      "",

    q47_q_regions:
      state.data.q47_q_regions ||
      "",

    q48_q_style:
      state.data.q48_q_style ||
      "",

    q56_typeDe:
      state.data.q56_typeDe ||
      "",

    q51_activitesA51:
      state.data.q51_activitesA51 ||
      "",

    q64_already_paid:
      state.data.q64_already_paid ||
      "",

    selected_plan:
      "integral_1eur",

    source:
      "nomerys_premium_form",

    submitSource:
      "custom_form",

    submitDate:
      new Date().toISOString(),

    request_id:
      cryptoRandomId(),

    tracking_attribution:
      getAttributionData(),

    tracking_session_id:
      NOMERYS_TRACKING.sessionId,

    form_duration_seconds:
      Math.round(
        (
          Date.now() -
          NOMERYS_TRACKING.pageLoadedAt
        ) / 1000
      )
  };
}

async function submit() {
  showLoading(true);

  trackNomerysEvent(
    "checkout_request_started",
    {
      selected_plan:
        "integral_1eur",

      traveller_count:
        Number(
          state.data.q54_nombreDe ||
          1
        ),

      destination_known:
        state.data.q36_avezvousDeja ===
        "Oui j'ai déjà une destination"
          ? "yes"
          : "no",

      comfort_level:
        state.data.q66_niveauConfort ||
        ""
    }
  );

  try {
    const payload =
      buildPayload();

    trackNomerysEvent(
      "form_submitted",
      {
        selected_plan:
          payload.selected_plan,

        traveller_count:
          Number(
            payload.q54_nombreDe ||
            1
          ),

        destination_known:
          payload.q36_avezvousDeja ===
          "Oui j'ai déjà une destination"
            ? "yes"
            : "no",

        comfort_level:
          payload.q66_niveauConfort ||
          ""
      }
    );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        25000
      );

    const response =
      await fetch(
        WEBHOOK_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            ),

          signal:
            controller.signal
        }
      );

    clearTimeout(timeout);

    const raw =
      await response.text();

    let data = {};

    try {
      data =
        JSON.parse(raw);
    } catch (error) {
      data = {};
    }

    console.log(
      "Réponse n8n brute:",
      raw
    );

    console.log(
      "Réponse n8n JSON:",
      data
    );

    if (!response.ok) {
      trackNomerysEvent(
        "checkout_response_error",
        {
          http_status:
            response.status,

          error_type:
            "webhook_http_error"
        }
      );

      throw new Error(
        raw ||
        `Erreur n8n ${response.status}`
      );
    }

    const checkoutUrl =
      Array.isArray(data)
        ? (
            data[0]?.checkout_url ||
            data[0]?.checkoutUrl ||
            data[0]?.url
          )
        : (
            data.checkout_url ||
            data.checkoutUrl ||
            data.url
          );

    if (
      SKIP_PAYMENT_FOR_TEST
    ) {
      showLoading(false);

      trackNomerysEvent(
        "form_test_submitted",
        {
          payment_skipped:
            true
        }
      );

      showToast(
        "Mode test : formulaire envoyé à n8n sans paiement Stripe."
      );

      return;
    }

    if (
      !checkoutUrl ||
      !/^https:\/\/checkout\.stripe\.com\//.test(
        checkoutUrl
      )
    ) {
      showLoading(false);

      trackNomerysEvent(
        "checkout_response_error",
        {
          http_status:
            response.status,

          error_type:
            "missing_checkout_url"
        }
      );

      showToast(
        "n8n a reçu le formulaire, mais n’a pas renvoyé d’URL Stripe valide. Il faut répondre avec checkout_url."
      );

      return;
    }

    trackNomerysEvent(
      "checkout_session_created",
      {
        selected_plan:
          "integral_1eur"
      }
    );

    trackNomerysEvent(
      "checkout_redirect",
      {
        checkout_provider:
          "stripe",

        selected_plan:
          "integral_1eur"
      }
    );

    /*
      Petit délai pour laisser le temps
      à GA4 et Clarity de placer
      l’événement dans leur file d’attente
      avant la redirection vers Stripe.
    */
    setTimeout(
      () => {
        window.location.assign(
          checkoutUrl
        );
      },
      180
    );

  } catch (error) {
    showLoading(false);

    const errorType =
      error.name === "AbortError"
        ? "webhook_timeout"
        : "webhook_request_error";

    trackNomerysEvent(
      "checkout_error",
      {
        error_type:
          errorType
      }
    );

    if (
      error.name ===
      "AbortError"
    ) {
      showToast(
        "La connexion prend trop de temps. Vérifie que le webhook n8n répond bien."
      );
    } else {
      showToast(
        "Impossible d’envoyer le formulaire. Vérifie le webhook n8n, le mode Production et le CORS."
      );

      console.error(error);
    }
  }
}

function card(
  value,
  icon,
  title,
  desc
) {
  return `
    <button
      type="button"
      class="choice"
      data-value="${escapeHtml(
        value
      )}"
    >
      <span class="choice-icon">
        ${icon}
      </span>

      <strong>
        ${title}
      </strong>

      <small>
        ${desc}
      </small>
    </button>
  `;
}

function choiceGroup(
  label,
  name,
  items
) {
  return `
    <div class="field">
      <div class="label">
        <span>
          ${label}
        </span>

        <span class="hint">
          optionnel
        </span>
      </div>

      <div class="choice-grid">
        ${items
          .map(
            (
              [
                value,
                icon,
                desc
              ]
            ) => `
              <button
                type="button"
                class="choice"
                data-name="${escapeHtml(
                  name
                )}"
                data-value="${escapeHtml(
                  value
                )}"
              >
                <span class="choice-icon">
                  ${icon}
                </span>

                <strong>
                  ${value}
                </strong>

                <small>
                  ${desc}
                </small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function input(
  label,
  name,
  type = "text",
  placeholder = "",
  autocomplete = ""
) {
  const value =
    state.data[name] ||
    "";

  const clarityMask =
    [
      "firstName",
      "lastName",
      "q4_email"
    ].includes(name)
      ? 'data-clarity-mask="true"'
      : "";

  return `
    <label class="field">
      <span class="label">
        <span>
          ${label}
        </span>
      </span>

      <input
        class="input"
        name="${escapeHtml(
          name
        )}"
        type="${type}"
        placeholder="${escapeHtml(
          placeholder
        )}"
        autocomplete="${autocomplete}"
        value="${escapeHtml(
          value
        )}"
        ${clarityMask}
      >
    </label>
  `;
}

function textarea(
  label,
  name,
  placeholder = ""
) {
  return `
    <label class="field">
      <span class="label">
        <span>
          ${label}
        </span>

        
      </span>

      <textarea
        class="textarea"
        name="${escapeHtml(
          name
        )}"
        placeholder="${escapeHtml(
          placeholder
        )}"
        data-clarity-mask="true"
      >${escapeHtml(
        state.data[name] ||
        ""
      )}</textarea>
    </label>
  `;
}

function summaryLine(
  label,
  value
) {
  return `
    <div class="summary-line">
      <span>
        ${label}
      </span>

      <b>
        ${escapeHtml(
          value
        )}
      </b>
    </div>
  `;
}

function val(name) {
  const el =
    $(
      `[name="${cssEscape(
        name
      )}"]`
    );

  return (
    el
      ? el.value
      : state.data[name] ||
        ""
  ).trim();
}

function required(
  name,
  message
) {
  return state.data[name]
    ? true
    : fail(message);
}

function fail(message) {
  return message;
}

function showError(message) {
  errorText.textContent =
    message;

  errorBox.classList.add(
    "show"
  );

  errorBox.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function hideError() {
  errorBox.classList.remove(
    "show"
  );

  errorText.textContent =
    "";
}

function showToast(message) {
  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  setTimeout(
    () => {
      toast.classList.remove(
        "show"
      );
    },
    6500
  );
}

function showLoading(show) {
  const screen =
    $("#loadingScreen");

  screen.classList.toggle(
    "show",
    show
  );

  screen.setAttribute(
    "aria-hidden",
    show
      ? "false"
      : "true"
  );
}

function updateMini() {
   const destinationCountry =
    state.data.q37_q_arrive_city ||
    "";

  const destinationArea =
    state.data.q67_villeZoneArrivee ||
    "";

  const destination =
    destinationCountry
      ? (
          destinationArea
            ? `${destinationArea} — ${destinationCountry}`
            : destinationCountry
        )
      : (
          state.data.q36_avezvousDeja ===
          "Non je n'ai pas d'idée"
            ? "À proposer"
            : "À définir"
        );

  $("#miniDestination")
    .textContent =
    destination;

  $("#miniDates")
    .textContent =
    formatDates() ||
    "—";

  $("#miniTravellers")
    .textContent =
    state.data.q54_nombreDe
      ? `${state.data.q54_nombreDe} personne(s)`
      : "—";

  $("#passStatus")
    .textContent =
    currentStep()?.name ||
    "En préparation";

  const miniStatus =
    $("#miniStatus");

  if (miniStatus) {
    miniStatus.textContent =
      currentStep()?.submit
        ? "Prête"
        : "En cours";
  }
}

function formatDates() {
  if (
    !state.data.startDateRaw ||
    !state.data.endDateRaw
  ) {
    return "";
  }

  return `${
    formatFrenchDate(
      state.data.startDateRaw
    )
  } → ${
    formatFrenchDate(
      state.data.endDateRaw
    )
  }`;
}

function formatFrenchDate(
  date
) {
  const [
    year,
    month,
    day
  ] = date.split("-");

  return `${day}/${month}/${year}`;
}

function splitDate(raw) {
  if (
    !raw ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      raw
    )
  ) {
    return {
      day: "",
      month: "",
      year: ""
    };
  }

  const [
    year,
    month,
    day
  ] = raw.split("-");

  return {
    day,
    month,
    year
  };
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
    email
  );
}

function toInputDate(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}

function cssEscape(value) {
  if (
    window.CSS &&
    CSS.escape
  ) {
    return CSS.escape(
      value
    );
  }

  return String(
    value
  ).replace(
    /["\\]/g,
    "\\$&"
  );
}

function cryptoRandomId() {
  if (
    window.crypto
      ?.randomUUID
  ) {
    return window.crypto
      .randomUUID();
  }

  return `req_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

nextBtn.addEventListener(
  "click",
  next
);

backBtn.addEventListener(
  "click",
  back
);

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
      "Enter"
    ) {
      const active =
        document.activeElement;

      if (
        active &&
        active.tagName ===
        "TEXTAREA"
      ) {
        return;
      }

      event.preventDefault();
      next();
    }
  }
);

function bootNomerys() {
  try {
    trackNomerysEvent(
      "form_view",
      {
        landing_page:
          window.location.pathname,

        referrer_domain:
          getReferrerDomain()
      }
    );

    renderStep();

    setTimeout(
      () => {
        if (
          !mount ||
          mount.innerHTML.trim() ===
          ""
        ) {
          console.warn(
            "Nomerys empty mount detected. Re-rendering..."
          );

          renderStep();
        }
      },
      300
    );

    setTimeout(
      () => {
        if (
          !mount ||
          mount.innerHTML.trim() ===
          ""
        ) {
          console.warn(
            "Nomerys second empty mount detected. Showing fallback..."
          );

          trackNomerysEvent(
            "form_error",
            {
              error_type:
                "empty_mount"
            }
          );

          mount.innerHTML = `
            <section class="step">
              <div class="step-kicker">
                Bienvenue
              </div>

              <h2>
                Commence ta demande.
              </h2>

              <p class="step-desc">
                Recharge la page si le formulaire ne s’affiche pas correctement.
              </p>
            </section>
          `;
        }
      },
      1200
    );

  } catch (error) {
    console.error(
      "Nomerys boot error:",
      error
    );

    trackNomerysEvent(
      "form_error",
      {
        error_type:
          "boot_error"
      }
    );
  }
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    bootNomerys
  );
} else {
  bootNomerys();
}
