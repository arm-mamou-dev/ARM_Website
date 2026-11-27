(function () {
  "use strict";

  const API = (window.ARM_CONFIG && window.ARM_CONFIG.SCRIPT_URL) || "";
  const PAGE = document.body.dataset.page;
  const $ = (sel) => document.querySelector(sel);

  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
    "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];

  // All 36 sub-prefectures of the Mamou region (fallback; the live list comes from the DataSheet)
  const SUBPREFS = ["Mamou-Centre", "Bouliwel", "Gongoret", "Konkouré", "Ouré-Kaba", "Soyah", "Tolo",
    "Timbo", "Dounet", "Kégnéko", "N'yagara", "Porédaka", "Saramoussaya", "Téguéréya",
    "Dalaba-Centre", "Bodié", "Ditinn", "Kaala", "Kankalabé", "Kébali", "Koba", "Mafara", "Mitty", "Mombeya",
    "Pita-Centre", "Bantignel", "Brouwal Tappé", "Donghol Touma", "Gongoré", "Ley Miro", "Maci", "Ninguélandé",
    "Sangaréah", "Sintaly", "Timbi Madina", "Timbi Tounni"];
  const slugOf = (n) => n.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // ---------------------------------------------------------
  // French text (English is in the HTML)
  // ---------------------------------------------------------
  const FR = {
    "nav.skip": "Aller au contenu",
    "hx.eyebrow": "Association Des Ressortissants de Mamou · États-Unis",
    "hx.title": "Ensemble, construisons un Mamou plus fort.",
    "hx.lead": "L'ARM rassemble les ressortissants de la région de Mamou vivant aux États-Unis. En devenant membre, vous participez à nos projets pour l'éducation, la terre et une maison pour notre communauté, avec une transparence totale sur chaque dollar.",
    "hx.login": "Espace membre",
    "hx.note": "Inscription gratuite · environ une minute · en français et en anglais",
    "hx.cardName": "Votre nom",
    "stat.members": "Membres inscrits",
    "stat.prefs": "Préfectures de la région de Mamou",
    "stat.subprefs": "Sous-préfectures représentées",
    "stat.projects": "Projets communautaires en cours",
    "why.eyebrow": "Ce que fait l'ARM",
    "why.title": "Une communauté, au service de Mamou",
    "why.f1.t": "Unir nos ressortissants",
    "why.f1.d": "Les familles de chaque sous-préfecture de la région de Mamou, réunies dans une seule association, avec une seule voix.",
    "why.f2.t": "Investir à Mamou",
    "why.f2.d": "L'éducation de nos enfants, des terres pour la communauté et un bâtiment à nous : des projets que les membres peuvent voir et suivre.",
    "why.f3.t": "Chaque dollar justifié",
    "why.f3.d": "Des comptes bancaires séparés avec deux signataires, des rapports mensuels aux membres et une vérification externe des comptes chaque année.",
    "how.eyebrow": "Comment devenir membre",
    "how.title": "Devenez membre en trois étapes",
    "how.lead": "L'inscription est gratuite. Votre numéro de membre donne accès à votre carte, à votre statut et aux projets que vous soutenez.",
    "how.s1.t": "Inscrivez-vous en ligne",
    "how.s1.d": "Indiquez votre nom, votre téléphone, votre État et votre sous-préfecture d'origine. Cela prend environ une minute.",
    "how.s2.t": "Recevez votre carte de membre",
    "how.s2.d": "Vous recevez tout de suite votre numéro de membre, avec une carte indiquant votre préfecture, votre district et votre État.",
    "how.s3.t": "Participez",
    "how.s3.d": "Le bureau confirme votre adhésion. Ensuite, venez aux réunions, soutenez les projets et suivez nos progrès.",
    "proj.eyebrow": "Nos projets",
    "proj.title": "Où va votre soutien",
    "proj.all": "Voir tous les projets",
    "proj.more": "En savoir plus",
    "proj.p1.tag": "Bâtiment",
    "proj.p1.t": "Une maison pour notre communauté",
    "proj.p1.d": "L'achat d'un bâtiment pour les réunions, les événements et des revenus locatifs, détenu ensemble par l'ARM et ses membres.",
    "proj.p2.tag": "Éducation",
    "proj.p2.t": "L'éducation à Mamou",
    "proj.p2.d": "Cours de révision, fascicules et prix dans les écoles partenaires pour aider les élèves à réussir leurs examens nationaux.",
    "proj.p3.tag": "Terre",
    "proj.p3.t": "Des terres pour la communauté",
    "proj.p3.d": "Des parcelles enregistrées au nom de l'ARM et mises en valeur pour des revenus durables à Mamou.",
    "ev.eyebrow": "Calendrier",
    "ev.title": "Événements à venir",
    "ev.all": "Tout le calendrier",
    "ev.loading": "Chargement des événements…",
    "cta.title": "Rejoignez la famille ARM dès aujourd'hui",
    "cta.text": "Inscrivez-vous en une minute et recevez votre carte de membre. Votre adhésion renforce chaque projet.",
    "cta.faq": "Des questions ? Lisez la FAQ",
    "ft.about": "L'association des ressortissants de la région de Mamou vivant aux États-Unis : Mamou, Timbo, Dalaba et Pita.",
    "ft.org": "L'association",
    "ft.members": "Membres",
    "ft.contact": "Nous joindre",
    "ft.contactText": "Pour toute question, contactez le bureau de l'ARM par les groupes WhatsApp de l'association.",
    "ft.status": "Vérifier mon statut",
    "ft.legal": "Les informations des membres restent privées et ne sont jamais publiées sur ce site.",
    "nav.home": "Accueil",
    "nav.about": "À propos",
    "nav.faq": "FAQ",
    "nav.projects": "Projets",
    "nav.calendar": "Calendrier",
    "cal.title": "Calendrier",
    "cal.intro": "Assemblées générales, événements et collectes de fonds de l'association.",
    "cal.loading": "Chargement du calendrier…",
    "cal.showPast": "Voir les événements passés",
    "cal.list": "Liste",
    "cal.grid": "Mois",
    "cal.hidePast": "Masquer les événements passés",
    "cal.note": "Les dates peuvent changer. Suivez les groupes WhatsApp de l'ARM pour les confirmations.",
    "nav.federation": "Fédération",
    "nav.admin": "Admin",
    "nav.menu": "Menu",
    "form.allRequired": "Veuillez remplir chaque champ. Les champs « facultatif » peuvent rester vides.",
    "form.phonePh": "ex. 555-123-4567",
    "login.idPh": "ex. ARM-0001",
    "admin.title": "Administration",
    "admin.tabMembers": "Membres",
    "admin.tabTexts": "SMS",
    "admin.colTexts": "SMS",
    "admin.tSetup": "L'envoi de SMS n'est pas encore configuré. Ouvrez le fichier <strong>ARM Members</strong> → menu <strong>ARM Admin → Set up texting (Twilio)…</strong> (voir le README, étape 5).",
    "admin.tNew": "Nouveau SMS",
    "admin.tAllStates": "Tous les États",
    "admin.tMessage": "Message",
    "admin.tMessagePh": "ex. Bonjour {first}, l'assemblée générale de l'ARM a lieu ce dimanche à 14 h. À bientôt !",
    "admin.tHelp": "<code>{first}</code> est remplacé par le prénom de chaque membre. Chaque SMS se termine par :",
    "admin.tTestPh": "Votre numéro, pour un test",
    "admin.tTest": "Envoyer un test",
    "admin.tHistory": "Messages envoyés",
    "admin.tColDate": "Envoyé le",
    "admin.tColAudience": "Destinataires",
    "admin.tColResult": "Remis à Twilio",
    "admin.tEmpty": "Aucun message envoyé pour le moment.",
    "admin.tWhoTitle": "Qui reçoit les SMS ?",
    "admin.tWho1": "Uniquement les membres <strong>actifs</strong> dont la colonne <strong>Texts</strong> est <strong>Yes</strong>. Les membres font ce choix à l'inscription.",
    "admin.tWho2": "Pour les membres inscrits avant : quand un membre donne son accord (par écrit, ex. un SMS ou une feuille d'inscription), mettez sa colonne Texts à Yes dans le fichier ARM Members.",
    "admin.tWho3": "Un membre qui répond STOP est désabonné par Twilio ; sa colonne Texts passe à No au prochain envoi.",
    "admin.tWho4": "Envoyez les SMS entre 9 h et 20 h. Les problèmes de remise après acceptation apparaissent dans la console Twilio → Monitor → Messaging logs.",
    "admin.or": "ou connectez-vous avec le mot de passe administrateur",
    "admin.username": "Identifiant",
    "admin.password": "Mot de passe",
    "admin.signIn": "Se connecter",
    "admin.tabFinance": "Finances",
    "admin.mTotal": "Membres",
    "admin.mTotalSub": "inscrits",
    "admin.mActive": "Actifs",
    "admin.mPending": "En attente",
    "admin.mPendingSub": "à valider",
    "admin.mInactive": "Inactifs",
    "admin.mSearch": "Rechercher nom, téléphone ou n°",
    "admin.mAllSp": "Toutes les sous-préfectures",
    "admin.mAllStatus": "Tous les statuts",
    "admin.mAllGroups": "Tous les groupes",
    "admin.mExport": "Exporter en CSV",
    "admin.mRegistered": "Inscrit le",
    "admin.mEmpty": "Aucun membre ne correspond à cette sélection.",
    "admin.signOut": "Se déconnecter",
    "admin.signInTitle": "Connexion administrateur",
    "admin.signInText": "Connectez-vous avec votre compte Google (seules les adresses de la liste des administrateurs ont accès), ou avec l'identifiant et le mot de passe administrateur.",
    "admin.privacyTitle": "Confidentialité",
    "admin.privacy1": "Les informations des membres et bancaires ne sont jamais affichées sur le site public.",
    "admin.privacy2": "Chaque demande est vérifiée auprès de Google et de la liste des administrateurs.",
    "admin.privacy3": "Vous êtes déconnecté en fermant cet onglet.",
    "admin.balance": "Solde bancaire",
    "admin.in": "Entrées",
    "admin.out": "Sorties",
    "admin.net": "Net",
    "admin.forPeriod": "pour la période choisie",
    "admin.pMonth": "Ce mois-ci",
    "admin.pLastMonth": "Le mois dernier",
    "admin.p3Months": "3 derniers mois",
    "admin.pYear": "Cette année",
    "admin.pAll": "Depuis le début",
    "admin.allAccounts": "Tous les comptes",
    "admin.allCategories": "Toutes les catégories",
    "admin.search": "Rechercher un libellé",
    "admin.import": "Importer un CSV Chase",
    "admin.addTx": "+ Ajouter une opération",
    "admin.addTxTitle": "Ajouter une opération manuellement",
    "admin.direction": "Type",
    "admin.account": "Compte",
    "admin.descPh": "ex. Cotisations en espèces collectées à l'assemblée générale",
    "admin.manualNote": "Les saisies manuelles comptent dans les entrées et sorties mais ne modifient pas le solde bancaire. Si le même montant apparaît ensuite dans un import Chase, supprimez la saisie manuelle pour ne pas le compter deux fois.",
    "admin.cancelBtn": "Annuler",
    "admin.addTxSave": "Ajouter l'opération",
    "admin.colDate": "Date",
    "admin.colDesc": "Libellé",
    "admin.colCat": "Catégorie",
    "admin.colNotes": "Notes",
    "admin.colAmount": "Montant",
    "admin.colBalance": "Solde",
    "admin.empty": "Aucune opération pour cette sélection.",
    "admin.more": "Afficher plus",
    "admin.howTitle": "Comment télécharger les opérations depuis Chase",
    "admin.how1": "Connectez-vous sur chase.com et ouvrez le compte.",
    "admin.how2": "Cliquez sur l'icône de téléchargement au-dessus de la liste des opérations.",
    "admin.how3": "Choisissez le format CSV et la période, puis Télécharger.",
    "admin.how4": "Cliquez sur « Importer un CSV Chase » ici et choisissez le fichier. Les opérations déjà importées sont ignorées automatiquement.",
    "form.subpref": "Sous-préfecture d'origine",
    "form.subprefPick": "Choisissez votre sous-préfecture",
    "card.sp": "Sous-préf.",
    "card.prefecture": "Préfecture",
    "form.known": "Surnom, dit (facultatif)",
    "form.knownShort": "Surnom",
    "form.knownHelp": "Le nom que la communauté vous donne, par exemple Thierno, Néné ou Bobo.",
    "card.district": "District",
    "card.code": "Code",
    "card.codeLong": "Code de membre",
    "form.district": "District d'origine",
    "form.districtPick": "Choisissez votre district (facultatif)",
    "form.districtHelp": "Pas dans la liste ? Laissez vide, l'ARM ajoutera votre district.",
    "about.fedTitle": "Une fédération des sous-préfectures de Mamou",
    "about.fedText": "L'ARM fonctionne comme un système fédéral. Les associations des sous-préfectures de Mamou et de Timbo travaillent chacune localement, réunies au sein de l'ARM, et l'ARM est partenaire des associations de Dalaba et de Pita dans toute la région de Mamou.",
    "about.fedLink": "Voir la fédération",
    "fed.title": "La fédération ARM",
    "fed.intro": "La région de Mamou compte quatre préfectures : Mamou, Timbo, Dalaba et Pita, avec 36 sous-préfectures. L'ARM réunit les associations de Mamou et de Timbo, et travaille en partenariat avec les associations de Dalaba et de Pita aux États-Unis.",
    "fed.t1": "Niveau fédéral : direction, projets communs et registre des membres",
    "fed.t2t": "Associations de sous-préfectures",
    "fed.t2": "Niveau local : chaque communauté organise ses membres et ses activités",
    "fed.t3t": "Membres",
    "fed.t3": "Chaque membre s'inscrit une fois auprès de l'ARM et appartient à sa sous-préfecture",
    "fed.listTitle": "Sous-préfectures de la région de Mamou",
    "fed.listText": "Les 36 sous-préfectures de la région de Mamou, par préfecture. Choisissez-en une pour voir sa page. Les sites web sont indiqués lorsque l'association locale en possède un.",
    "sp.fedMember": "Membre de la fédération ARM",
    "sp.bigMap": "Voir la carte en grand",
    "sp.fedCount": "Membres de l'ARM issus de cette communauté :",
    "nav.login": "Espace membre",
    "proj.title": "Projets",
    "proj.lead": "Les projets de l'association, avec un avancement mis à jour par la direction de l'ARM.",
    "proj.loading": "Chargement des projets…",
    "quick.proj.t": "Nos projets",
    "quick.proj.d": "Achat d'un bâtiment et éducation : suivez nos deux projets.",
    "nav.register": "S'inscrire",

    "home.sub": "Inscription officielle des membres",
    "home.text": "L'ARM rassemble les ressortissants de Mamou et leurs familles vivant à l'étranger. Inscrivez-vous comme membre officiel pour renforcer nos liens, participer aux projets de développement et accéder aux avantages membres.",
    "home.register": "S'inscrire comme membre",
    "home.status": "Vérifier mon statut",
    "quick.reg.t": "Nouveau membre",
    "quick.reg.d": "Inscrivez-vous en moins d'une minute et recevez votre numéro de membre.",
    "quick.login.t": "Déjà inscrit",
    "quick.login.d": "Connectez-vous avec votre numéro de membre pour voir votre statut.",
    "quick.about.t": "À propos de l'ARM",
    "quick.about.d": "Notre mission, nos groupes et l'importance de l'adhésion.",
    "quick.faq.t": "Questions",
    "quick.faq.d": "Réponses aux questions fréquentes sur l'inscription.",

    "about.title": "À propos de l'ARM",
    "about.p1": "L'Association Des Ressortissants de Mamou (ARM) réunit les ressortissants de Mamou, en Guinée, et leurs familles vivant à l'étranger. Nous restons unis, célébrons notre culture et travaillons ensemble sur des projets durables pour notre terroir.",
    "about.p2": "L'inscription officielle permet à l'association de disposer d'une liste de membres fiable pour mieux communiquer, mieux s'organiser et représenter notre communauté d'une seule voix.",
    "about.why": "Pourquoi s'inscrire",
    "b1.t": "Adhésion officielle", "b1.d": "Recevez votre numéro de membre ARM.",
    "b2.t": "Liens communautaires", "b2.d": "Restez en contact grâce aux événements et à l'entraide.",
    "b3.t": "Projets de développement", "b3.d": "Participez aux projets qui améliorent la vie à Mamou.",
    "b4.t": "Avantages membres", "b4.d": "Accédez aux annonces et programmes réservés aux membres.",
    "about.groups": "Groupes de membres",
    "about.subTitle": "Les sous-préfectures de Mamou",
    "about.subText": "La préfecture de Mamou comprend la commune urbaine de Mamou et 13 sous-préfectures. L'ARM accueille des membres de toutes ces localités.",
    "about.urban": "Mamou (commune urbaine)",
    "sp.crumb": "Sous-préfectures",
    "sp.prefOf": "Préfecture de",
    "sp.provisional": "La répartition des sous-préfectures entre Mamou et Timbo est provisoire jusqu'à la publication de la liste officielle.",
    "sp.noPop": "La population par sous-préfecture du recensement de 2014 n'est pas encore disponible pour cette préfecture.",
    "fed.lvl.region": "Région",
    "fed.lvl.pref": "Préfecture",
    "fed.lvl.sp": "Sous-préfecture",
    "fed.lvl.dist": "District",
    "fed.regionName": "Région de Mamou",
    "fed.prefs": "préfectures",
    "fed.partnerShort": "Partenaire",
    "fed.partner": "Partenaire : association propre aux États-Unis",
    "fed.provisional": "Liste provisoire",
    "fed.subprefs": "sous-préfectures",
    "sp.kind.Mamou": "Sous-préfecture de la préfecture de Mamou, région de Mamou, Guinée",
    "sp.kindUrban.Mamou": "Commune urbaine de la préfecture de Mamou, région de Mamou, Guinée",
    "about.urban.Mamou": "Mamou (commune urbaine)",
    "sp.kind.Timbo": "Sous-préfecture de la préfecture de Timbo, région de Mamou, Guinée",
    "sp.kindUrban.Timbo": "Commune urbaine de la préfecture de Timbo, région de Mamou, Guinée",
    "about.urban.Timbo": "Timbo (commune urbaine)",
    "sp.kind.Dalaba": "Sous-préfecture de la préfecture de Dalaba, région de Mamou, Guinée",
    "sp.kindUrban.Dalaba": "Commune urbaine de la préfecture de Dalaba, région de Mamou, Guinée",
    "about.urban.Dalaba": "Dalaba (commune urbaine)",
    "sp.kind.Pita": "Sous-préfecture de la préfecture de Pita, région de Mamou, Guinée",
    "sp.kindUrban.Pita": "Commune urbaine de la préfecture de Pita, région de Mamou, Guinée",
    "about.urban.Pita": "Pita (commune urbaine)",
    "sp.partner.Dalaba": "Préfecture partenaire : Dalaba a sa propre association aux États-Unis",
    "sp.partner.Pita": "Préfecture partenaire : Pita a sa propre association aux États-Unis",
    "sp.kind": "Sous-préfecture de la préfecture de Mamou, Guinée",
    "sp.kindUrban": "Commune urbaine de la préfecture de Mamou, Guinée",
    "sp.site": "Site web de l'association",
    "sp.pop": "Population (recensement 2014)",
    "sp.share": "Part de la préfecture",
    "sp.prefecture": "Préfecture",
    "sp.country": "Pays",
    "sp.guinea": "Guinée",
    "sp.link": "Lien vers cette page",
    "sp.copy": "Copier le lien",
    "sp.joinTitle": "Rejoignez l'ARM",
    "sp.joinText": "Inscrivez-vous une fois auprès de l'ARM et vous êtes compté comme membre de votre sous-préfecture. L'inscription est gratuite et prend moins d'une minute.",
    "sp.source": "Population : 3e Recensement général (RGPH-3, 2014), Institut National de la Statistique de Guinée.",
    "sp.others": "Toutes les sous-préfectures de la région de Mamou",
    "about.note": "Hommes et femmes sont réunis au sein d'une seule association. Vous choisissez votre groupe lors de l'inscription.",
    "group.male": "Homme",
    "group.female": "Femme",

    "faq.title": "Questions fréquentes",
    "faq.q1": "Qui peut s'inscrire ?",
    "faq.a1": "Toute personne originaire de Mamou, ou ayant des racines familiales à Mamou, qui souhaite devenir membre officiel de l'association.",
    "faq.q2": "L'inscription est-elle payante ?",
    "faq.a2": "Non. L'inscription sur ce site est gratuite.",
    "faq.q3": "Je suis déjà inscrit. Puis-je m'inscrire à nouveau ?",
    "faq.a3": "Ce n'est pas nécessaire. Chaque numéro de téléphone ne peut être inscrit qu'une fois. Si vous réessayez, le site vous affichera votre numéro de membre existant.",
    "faq.q4": "Deux personnes peuvent-elles partager un numéro ?",
    "faq.a4": "Non. Le numéro de téléphone identifie chaque membre : chaque personne doit utiliser son propre numéro.",
    "faq.q5": "Que signifie mon statut ?",
    "faq.a5": "<strong>En attente</strong> : votre inscription a été reçue et attend la validation. <strong>Actif</strong> : vous êtes membre confirmé. <strong>Inactif</strong> : votre adhésion n'est pas active actuellement. Contactez la direction de l'ARM pour plus de détails.",
    "faq.q6": "J'ai perdu mon numéro de membre. Que faire ?",
    "faq.a6": "Allez sur la page d'inscription et saisissez à nouveau vos informations avec le même numéro de téléphone. Le site vous affichera votre numéro existant.",
    "faq.q7": "J'ai fait une erreur dans mon inscription.",
    "faq.a7": "Contactez la direction de l'ARM avec votre numéro de membre et la correction, et votre fiche sera mise à jour.",
    "faq.ready": "Prêt à nous rejoindre ?",
    "faq.readyText": "L'inscription est gratuite et prend moins d'une minute.",

    "reg.title": "Inscription des membres",
    "form.texts": "Oui, l'ARM peut m'envoyer par SMS ses nouvelles et rappels de réunion (facultatif). Fréquence variable. Des frais de messagerie et de données peuvent s'appliquer. Répondez STOP à tout moment pour vous désabonner.",
    "form.first": "Prénom",
    "form.last": "Nom",
    "form.phone": "Numéro de téléphone",
    "form.state": "État de résidence",
    "form.statePick": "Choisissez votre État",
    "form.group": "Groupe",
    "form.submit": "S'inscrire",
    "reg.okText": "Votre inscription a bien été reçue. Conservez votre numéro de membre : il vous servira pour vous connecter.",
    "reg.checkStatus": "Vérifier mon statut",
    "reg.another": "Inscrire une autre personne",
    "reg.howTitle": "Comment ça marche",
    "reg.how1": "Remplissez vos informations.",
    "reg.how2": "Vous recevez immédiatement votre numéro de membre.",
    "reg.how3": "La direction de l'ARM valide et active votre adhésion.",
    "reg.note": "Chaque numéro de téléphone ne peut être inscrit qu'une fois. Vos informations sont utilisées uniquement par la direction de l'ARM.",
    "reg.already": "Déjà inscrit ?",
    "reg.loginLink": "Se connecter",

    "card.label": "Carte de membre",
    "card.id": "N° de membre",
    "card.group": "Groupe",
    "card.state": "État",

    "login.title": "Espace membre",
    "login.id": "Numéro de membre",
    "login.phone": "Numéro de téléphone utilisé à l'inscription",
    "login.submit": "Se connecter",
    "login.helpTitle": "Besoin d'aide ?",
    "login.help1": "Votre numéro de membre s'est affiché lors de votre inscription (par exemple ARM-0001).",
    "login.help2": "Vous l'avez perdu ? Inscrivez-vous à nouveau avec le même numéro de téléphone et le site vous l'affichera.",
    "login.notYet": "Pas encore inscrit ?",

    "dash.logout": "Se déconnecter",
    "dash.status": "Statut d'adhésion",
    "dash.name": "Nom",
    "dash.phone": "Téléphone",
    "dash.since": "Inscrit le",
    "dash.correct": "Si une information est incorrecte, contactez la direction de l'ARM avec votre numéro de membre.",
  };

  const MSG = {
    en: {
      required: "This field is required.",
      phone: "Enter a valid phone number (at least 10 digits).",
      group: "Please choose your group.",
      subpref: "Please choose your sub-prefecture.",
      members: (n) => `${n} ${n === 1 ? "member" : "members"}`,
      memberId: "Enter your member ID, for example ARM-0001.",
      welcomeNew: (n) => `Welcome, ${n}.`,
      welcomeBack: (n) => `Welcome, ${n}`,
      dup: (id) => `This phone number is already registered${id ? ` as member <strong>${id}</strong>` : ""}. You can <a href="member.html">log in</a> to check your status.`,
      notFound: "We couldn't find a member with that ID and phone number. Please check both and try again.",
      tooMany: "Too many attempts. Please wait 10 minutes and try again.",
      err: "Something went wrong. Please check your connection and try again.",
      noApi: "The site is not connected to the member database yet.",
      sending: "Please wait…",
      status: { Pending: "Pending", Active: "Active", Inactive: "Inactive" },
      statusText: {
        Pending: "Your registration was received and is waiting for review by ARM leadership.",
        Active: "You are a confirmed, active member of ARM.",
        Inactive: "Your membership is not currently active. Please contact ARM leadership.",
      },
      outsideUS: "Outside U.S.",
      count: (n) => `<strong>${n}</strong> ${n === "1" ? "member" : "members"} registered so far.`,
      soonTitle: "Coming soon",
      soonPage: "This page is being built. Please check back later.",
      soonSection: "This section is being built. Please check back later.",
      soonHome: "Back to the home page",
      timeline: "Timeline",
      raised: (r, g, p) => `${r} raised of ${g} goal (${p}%)`,
      projNone: "No projects to show yet.",
      projErr: "Projects could not be loaded. Please try again later.",
      admin: {
        signedInAs: (n, e) => `Signed in as ${n} (${e})`,
        expired: "Your session has expired. Please sign in again.",
        forbidden: (e) => `The Google account ${e} is not on the ARM admin list. Ask an existing admin to add it to the Admins tab.`,
        notConfigured: "Admin sign-in is not set up yet (GOOGLE_CLIENT_ID is empty). See README, step 3.",
        count: (n) => `${n} ${n === 1 ? "transaction" : "transactions"}`,
        asOf: (d) => `as of ${d}`,
        noBalance: "Import a Chase checking CSV to see it",
        showing: (a, b) => `Showing ${a} of ${b}`,
        importing: (f) => `Importing ${f}…`,
        imported: (a, s, f) => `${f}: ${a} new ${a === 1 ? "transaction" : "transactions"} imported${s ? `, ${s} already imported (skipped)` : ""}.`,
        importErr: "The file could not be imported.",
        saveErr: "The change could not be saved. Please try again.",
        colDate: "Date", colDesc: "Description", colCat: "Category", colNotes: "Notes", colAmount: "Amount", colBalance: "Balance",
        cat: (c) => c,
        pwMissing: "Enter the username and password.",
        pwWrong: "Wrong username or password.",
        pwLocked: "Too many wrong attempts. Password sign-in is locked for 15 minutes (Google sign-in still works).",
        pwOff: "Password sign-in is turned off. Use Google sign-in, or set a password from the spreadsheet menu ARM Admin.",
        manual: "Manual entry", deleteTx: "Delete", deleted: "Transaction deleted.",
        confirmDelete: (d, a) => `Delete this manual entry?\n\n${d}  ${a}`,
        addTxMissing: "Enter a date, a description and an amount.",
        added: (d, a) => `Added: ${d} (${a}).`,
        split: "Split", editSplit: "Edit",
        splitHelp: "Split this transaction into several lines with their own category",
        splitLines: (n) => `Split · ${n} lines`,
        splitTitle: (a) => `Split ${a} into lines. The lines must add up to the full amount.`,
        line: (n) => `Line ${n}`,
        addLine: "+ Add line", removeLine: "Remove line", removeSplit: "Remove split", cancel: "Cancel", save: "Save split",
        remaining: (a) => `${a} left to assign`, over: (a) => `${a} too much`, balanced: "✓ Lines add up",
        emptyLine: "Enter an amount on every line (or remove the empty line)",
        splitSaved: (d) => `Split saved: ${d}`, splitRemoved: "Split removed.",
        colId: "Member ID", colName: "Name", colPhone: "Phone", colGroup: "Group", colSp: "Sub-prefecture",
        colState: "State", colRegistered: "Registered", colStatus: "Status", colTexts: "Texts",
        showingMembers: (a, b) => `Showing ${a} of ${b} members`,
        statusSaved: (id, st) => `${id} is now ${st}.`,
        yes: "Yes", no: "No",
        tAudience: (n, other) => `<strong>${n}</strong> ${n === 1 ? "member" : "members"} will receive this text.` +
          (other ? ` ${other} other active ${other === 1 ? "member has" : "members have"} not agreed to receive texts.` : ""),
        tSendBtn: (n) => `Send to ${n} ${n === 1 ? "member" : "members"}`,
        tCount: (c, seg, total) => `${c} characters with the ending · ${seg} SMS per member · about ${total} SMS in total`,
        tUnicode: " · contains special characters (e.g. ê, ç, emoji), so each SMS holds 70 characters instead of 160",
        tConfirm: (n, seg) => `Send this text to ${n} ${n === 1 ? "member" : "members"} now (about ${n * seg} SMS)?\n\nThis cannot be undone.`,
        tSending: "Sending…",
        tSent: (s, n) => `Sent to ${s} of ${n} ${n === 1 ? "member" : "members"}.`,
        tOptedOut: (n) => ` ${n} ${n === 1 ? "member had" : "members had"} replied STOP and will not be texted again.`,
        tErrors: (e) => ` Problems: ${e}`,
        tTestSent: (p) => `Test sent to ${p}. Check your phone.`,
        tTestPhone: "Enter your phone number to send a test.",
        tEmptyMsg: "Write a message first.",
        tNotSetUp: "Texting is not set up yet (see the notice above).",
        tBusy: "Another text is being sent right now. Please wait a minute and try again.",
        tResult: (s, n) => `${s} / ${n}`,
        tColTo: "To", tColResult: "Delivered to Twilio",
      },
      pstatus: { "Planned": "Planned", "In progress": "In progress", "Completed": "Completed", "On hold": "On hold", "Not started": "Upcoming", "Done": "Done", "Delayed": "Delayed" },
    },
    fr: {
      required: "Ce champ est obligatoire.",
      phone: "Entrez un numéro valide (au moins 10 chiffres).",
      group: "Veuillez choisir votre groupe.",
      subpref: "Veuillez choisir votre sous-préfecture.",
      members: (n) => `${n} ${n === 1 ? "membre" : "membres"}`,
      memberId: "Entrez votre numéro de membre, par exemple ARM-0001.",
      welcomeNew: (n) => `Bienvenue, ${n}.`,
      welcomeBack: (n) => `Bonjour, ${n}`,
      dup: (id) => `Ce numéro de téléphone est déjà inscrit${id ? ` (membre <strong>${id}</strong>)` : ""}. Vous pouvez <a href="member.html">vous connecter</a> pour voir votre statut.`,
      notFound: "Aucun membre ne correspond à ce numéro de membre et ce téléphone. Vérifiez les deux et réessayez.",
      tooMany: "Trop de tentatives. Veuillez patienter 10 minutes avant de réessayer.",
      err: "Une erreur s'est produite. Vérifiez votre connexion et réessayez.",
      noApi: "Le site n'est pas encore connecté à la base des membres.",
      sending: "Veuillez patienter…",
      status: { Pending: "En attente", Active: "Actif", Inactive: "Inactif" },
      statusText: {
        Pending: "Votre inscription a été reçue et attend la validation de la direction de l'ARM.",
        Active: "Vous êtes membre actif et confirmé de l'ARM.",
        Inactive: "Votre adhésion n'est pas active actuellement. Veuillez contacter la direction de l'ARM.",
      },
      outsideUS: "Hors É.-U.",
      count: (n) => `<strong>${n}</strong> ${n === "1" ? "membre déjà inscrit" : "membres déjà inscrits"}.`,
      soonTitle: "Bientôt disponible",
      soonPage: "Cette page est en cours de construction. Merci de revenir plus tard.",
      soonSection: "Cette section est en cours de construction. Merci de revenir plus tard.",
      soonHome: "Retour à l'accueil",
      timeline: "Calendrier",
      raised: (r, g, p) => `${r} collectés sur un objectif de ${g} (${p} %)`,
      projNone: "Aucun projet à afficher pour le moment.",
      projErr: "Impossible de charger les projets. Veuillez réessayer plus tard.",
      admin: {
        signedInAs: (n, e) => `Connecté : ${n} (${e})`,
        expired: "Votre session a expiré. Veuillez vous reconnecter.",
        forbidden: (e) => `Le compte Google ${e} ne figure pas sur la liste des administrateurs de l'ARM. Demandez à un administrateur de l'ajouter dans l'onglet Admins.`,
        notConfigured: "La connexion administrateur n'est pas encore configurée (GOOGLE_CLIENT_ID vide). Voir le README, étape 3.",
        count: (n) => `${n} ${n === 1 ? "opération" : "opérations"}`,
        asOf: (d) => `au ${d}`,
        noBalance: "Importez un relevé CSV du compte courant Chase",
        showing: (a, b) => `${a} sur ${b} affichées`,
        importing: (f) => `Import de ${f}…`,
        imported: (a, s, f) => `${f} : ${a} ${a === 1 ? "nouvelle opération importée" : "nouvelles opérations importées"}${s ? `, ${s} déjà présentes (ignorées)` : ""}.`,
        importErr: "Le fichier n'a pas pu être importé.",
        saveErr: "La modification n'a pas pu être enregistrée. Veuillez réessayer.",
        colDate: "Date", colDesc: "Libellé", colCat: "Catégorie", colNotes: "Notes", colAmount: "Montant", colBalance: "Solde",
        cat: (c) => ({ "Uncategorized": "Non classé", "Donation": "Don", "Membership dues": "Cotisation", "Building fund": "Fonds bâtiment",
          "Education": "Éducation", "Event": "Événement", "Expense": "Dépense", "Bank fee": "Frais bancaires", "Transfer": "Virement",
          "Refund": "Remboursement", "Other": "Autre", "Split": "Ventilée" }[c] || c),
        pwMissing: "Saisissez l'identifiant et le mot de passe.",
        pwWrong: "Identifiant ou mot de passe incorrect.",
        pwLocked: "Trop de tentatives. La connexion par mot de passe est bloquée 15 minutes (la connexion Google fonctionne toujours).",
        pwOff: "La connexion par mot de passe est désactivée. Utilisez la connexion Google ou définissez un mot de passe depuis le menu ARM Admin du fichier.",
        manual: "Saisie manuelle", deleteTx: "Supprimer", deleted: "Opération supprimée.",
        confirmDelete: (d, a) => `Supprimer cette saisie manuelle ?\n\n${d}  ${a}`,
        addTxMissing: "Saisissez une date, un libellé et un montant.",
        added: (d, a) => `Ajoutée : ${d} (${a}).`,
        split: "Ventiler", editSplit: "Modifier",
        splitHelp: "Répartir cette opération en plusieurs lignes, chacune avec sa catégorie",
        splitLines: (n) => `Ventilée · ${n} lignes`,
        splitTitle: (a) => `Ventiler ${a} en lignes. Le total des lignes doit être égal au montant.`,
        line: (n) => `Ligne ${n}`,
        addLine: "+ Ajouter une ligne", removeLine: "Supprimer la ligne", removeSplit: "Annuler la ventilation", cancel: "Annuler", save: "Enregistrer",
        remaining: (a) => `Reste ${a} à répartir`, over: (a) => `${a} en trop`, balanced: "✓ Le total est juste",
        emptyLine: "Saisissez un montant sur chaque ligne (ou supprimez la ligne vide)",
        splitSaved: (d) => `Ventilation enregistrée : ${d}`, splitRemoved: "Ventilation supprimée.",
        colId: "N° de membre", colName: "Nom", colPhone: "Téléphone", colGroup: "Groupe", colSp: "Sous-préfecture",
        colState: "État", colRegistered: "Inscrit le", colStatus: "Statut", colTexts: "SMS",
        showingMembers: (a, b) => `${a} membres affichés sur ${b}`,
        statusSaved: (id, st) => `${id} est maintenant : ${st}.`,
        yes: "Oui", no: "Non",
        tAudience: (n, other) => `<strong>${n}</strong> ${n === 1 ? "membre recevra" : "membres recevront"} ce SMS.` +
          (other ? ` ${other} autre${other === 1 ? " membre actif n'a" : "s membres actifs n'ont"} pas accepté de recevoir des SMS.` : ""),
        tSendBtn: (n) => `Envoyer à ${n} membre${n === 1 ? "" : "s"}`,
        tCount: (c, seg, total) => `${c} caractères avec la fin · ${seg} SMS par membre · environ ${total} SMS au total`,
        tUnicode: " · contient des caractères spéciaux (ex. ê, ç, emoji) : chaque SMS ne contient que 70 caractères au lieu de 160",
        tConfirm: (n, seg) => `Envoyer ce SMS à ${n} membre${n === 1 ? "" : "s"} maintenant (environ ${n * seg} SMS) ?\n\nCette action est définitive.`,
        tSending: "Envoi…",
        tSent: (s, n) => `Envoyé à ${s} membre${s === 1 ? "" : "s"} sur ${n}.`,
        tOptedOut: (n) => ` ${n} membre${n === 1 ? " avait" : "s avaient"} répondu STOP et ne recevr${n === 1 ? "a" : "ont"} plus de SMS.`,
        tErrors: (e) => ` Problèmes : ${e}`,
        tTestSent: (p) => `Test envoyé au ${p}. Vérifiez votre téléphone.`,
        tTestPhone: "Saisissez votre numéro pour envoyer un test.",
        tEmptyMsg: "Écrivez d'abord un message.",
        tNotSetUp: "L'envoi de SMS n'est pas encore configuré (voir l'avis ci-dessus).",
        tBusy: "Un autre envoi est en cours. Patientez une minute puis réessayez.",
        tResult: (s, n) => `${s} / ${n}`,
        tColTo: "Destinataires", tColResult: "Remis à Twilio",
      },
      pstatus: { "Planned": "Prévu", "In progress": "En cours", "Completed": "Terminé", "On hold": "En pause", "Not started": "À venir", "Done": "Terminé", "Delayed": "En retard" },
    },
  };

  // ---------------------------------------------------------
  // Language
  // ---------------------------------------------------------
  const i18nEls = document.querySelectorAll("[data-i18n]");
  i18nEls.forEach((el) => (el.dataset.en = el.innerHTML));

  let lang = "en";
  try { lang = localStorage.getItem("arm-lang") === "fr" ? "fr" : "en"; } catch (_) {}
  const msg = () => MSG[lang];
  const rerender = [];

  function applyLang() {
    document.documentElement.lang = lang;
    i18nEls.forEach((el) => {
      const fr = FR[el.dataset.i18n];
      el.innerHTML = lang === "fr" && fr ? fr : el.dataset.en;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.dataset.enPh = el.dataset.enPh || el.placeholder;
      el.placeholder = lang === "fr" && FR[el.dataset.i18nPh] ? FR[el.dataset.i18nPh] : el.dataset.enPh;
    });
    $("#langToggle").textContent = lang === "fr" ? "English" : "Français";
    rerender.forEach((fn) => fn());
  }

  $("#langToggle").addEventListener("click", () => {
    lang = lang === "fr" ? "en" : "fr";
    try { localStorage.setItem("arm-lang", lang); } catch (_) {}
    applyLang();
  });

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  const nav = $("#nav");
  const burger = $("#menuToggle");
  const current = nav.querySelector(`[data-nav="${PAGE}"]`);
  if (current) current.setAttribute("aria-current", "page");

  function setMenu(open) {
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  }
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".site-header")) setMenu(false); });

  $("#year").textContent = new Date().getFullYear();

  // ---------------------------------------------------------
  // Pages that need the database show a "being built" notice until it is connected
  // ---------------------------------------------------------
  const NEEDS_BACKEND = ["register", "member", "projects", "admin", "calendar"];
  const CFG = window.ARM_CONFIG || {};
  const pageOff = (PAGE === "admin" && !CFG.ADMIN_READY) || (PAGE === "projects" && !CFG.PROJECTS_READY);
  if ((!API || pageOff) && NEEDS_BACKEND.includes(PAGE)) {
    const body = document.querySelector(".page-body .container");
    const homeHref = location.pathname.includes("/mamou/") ? "../index.html" : "index.html";
    const showSoon = () => {
      body.innerHTML = `
        <div class="soon">
          <img class="soon-logo" src="/images/arm-logo.png" alt="" width="76" height="70">
          <h2>${msg().soonTitle}</h2>
          <p>${msg().soonPage}</p>
          <a href="${homeHref}" class="btn btn-outline">${msg().soonHome}</a>
        </div>`;
    };
    rerender.push(showSoon);
    applyLang();
    return;
  }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s'-])\S/g, (c) => c.toUpperCase());
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const groupText = (g) => (lang === "fr" ? FR["group." + String(g).toLowerCase()] : g) || g;
  const stateText = (s) => (s === "Outside U.S." ? msg().outsideUS : s);

  async function api(body) {
    const res = await fetch(API, {
      method: "POST",
      // text/plain keeps this a simple request (Apps Script doesn't answer CORS preflights)
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function formatPhoneInput(input) {
    input.addEventListener("input", () => {
      if (input.value.trim().startsWith("+")) return;
      const d = input.value.replace(/\D/g, "").slice(0, 10);
      input.value = d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
    });
  }

  function makeErrors(form) {
    const set = (name, text) => {
      const small = form.querySelector(`.error[data-for="${name}"]`);
      if (!small) return;
      small.textContent = text || "";
      small.closest(".field").classList.toggle("invalid", !!text);
    };
    form.addEventListener("input", (e) => e.target.name && set(e.target.name, ""));
    form.addEventListener("change", (e) => e.target.name && set(e.target.name, ""));
    return set;
  }

  function notice(el, cls, html) {
    el.className = "notice " + cls;
    el.innerHTML = html;
  }

  function fillCard(prefix, m) {
    $(`#${prefix}Name`).textContent = `${m.firstName} ${m.lastName}`;
    const known = $(`#${prefix}Known`);
    if (known) { known.textContent = m.knownAs ? (lang === "fr" ? "dit " : "Known as ") + m.knownAs : ""; known.hidden = !m.knownAs; }
    $(`#${prefix}Id`).textContent = m.memberId;
    $(`#${prefix}Group`).textContent = groupText(m.group);
    $(`#${prefix}Sp`).textContent = m.subpref || "—";
    $(`#${prefix}Pref`).textContent = m.prefecture || "—";
    $(`#${prefix}Dist`).textContent = m.district || "—";
    $(`#${prefix}State`).textContent = m.state ? stateText(m.state).replace(/\s*\([A-Z]{2}\)$/, "") : "—";
  }

  // ---------------------------------------------------------
  // Home: live member count and the next events from the calendar
  // ---------------------------------------------------------
  if (PAGE === "home") {
    const loc = () => (lang === "fr" ? "fr-FR" : "en-US");
    let count = null, events = null;
    const evEl = $("#homeEvents");
    const day = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
    const today = (() => { const n = new Date(); return [n.getFullYear(), String(n.getMonth() + 1).padStart(2, "0"), String(n.getDate()).padStart(2, "0")].join("-"); })();
    const TYPES = { fr: { "General Assembly": "Assemblée générale", Event: "Événement", Fundraiser: "Collecte de fonds", Meeting: "Réunion", Deadline: "Échéance", Other: "Autre" } };
    const show = () => {
      if (count !== null) $("#statMembers").textContent = count.toLocaleString(loc());
      if (events === null || !evEl) return;
      const next = (events || []).filter((e) => e.date >= today && e.status !== "Cancelled").slice(0, 3);
      if (!next.length) {
        evEl.innerHTML = `<li class="ev-empty muted">${lang === "fr" ? "Aucun événement à venir pour le moment. Revenez bientôt." : "No upcoming events yet. Check back soon."}</li>`;
        return;
      }
      evEl.innerHTML = next.map((e) => {
        const d = day(e.date);
        const type = (lang === "fr" && TYPES.fr[e.type]) || e.type || "";
        return `<li class="ev">
          <div class="ev-date"><span>${esc(d.toLocaleDateString(loc(), { month: "short" }))}</span><strong>${d.getDate()}</strong></div>
          <div class="ev-body">
            <p class="ev-type">${esc(type)}</p>
            <h3>${esc(e.title)}</h3>
            <p class="ev-when">${esc(d.toLocaleDateString(loc(), { weekday: "long", year: "numeric", month: "long", day: "numeric" }))}${e.location ? " · " + esc(e.location) : ""}</p>
          </div>
        </li>`;
      }).join("");
    };
    rerender.push(show);
    if (API) {
      fetch(API).then((r) => r.json()).then((d) => { count = Number(d.count) || 0; show(); }).catch(() => {});
      fetch(API + (API.includes("?") ? "&" : "?") + "action=calendar").then((r) => r.json())
        .then((d) => { events = d.status === "ok" ? d.events || [] : []; show(); })
        .catch(() => { events = []; show(); });
    } else { events = []; show(); }
  }

  // ---------------------------------------------------------
  // Calendar (Meetings tab rows marked "Show on website")
  // ---------------------------------------------------------
  if (PAGE === "calendar") {
    const list = $("#calList");
    const pastBtn = $("#calPastBtn");
    const gridEl = $("#calGrid");
    let events = null, showPast = false;
    let view = "list";
    try { view = localStorage.getItem("arm-cal-view") === "grid" ? "grid" : "list"; } catch (_) {}
    let gridMonth = null, pickedDay = null;   // gridMonth: "yyyy-mm"
    const T = {
      en: { "General Assembly": "General assembly", Event: "Event", Fundraiser: "Fundraiser", Meeting: "Meeting",
            Condolence: "Condolence", Deadline: "Deadline", Other: "Other",
            Done: "Done", Cancelled: "Cancelled", none: "No upcoming events yet. Check back soon.", err: "The calendar could not be loaded. Please try again later.",
            today: "Today", past: "Past events", showPast: "Show past events", hidePast: "Hide past events",
            prev: "Previous month", next: "Next month", thisMonth: "Today", noDay: "No events on this day.", pick: "Tap a highlighted day to see its events." },
      fr: { "General Assembly": "Assemblée générale", Event: "Événement", Fundraiser: "Collecte de fonds", Meeting: "Réunion",
            Condolence: "Condoléances", Deadline: "Échéance", Other: "Autre",
            Done: "Terminé", Cancelled: "Annulé", none: "Aucun événement à venir pour le moment. Revenez bientôt.", err: "Le calendrier n'a pas pu être chargé. Réessayez plus tard.",
            today: "Aujourd'hui", past: "Événements passés", showPast: "Voir les événements passés", hidePast: "Masquer les événements passés",
            prev: "Mois précédent", next: "Mois suivant", thisMonth: "Aujourd'hui", noDay: "Aucun événement ce jour-là.", pick: "Touchez un jour en couleur pour voir ses événements." },
    };
    const t = () => T[lang === "fr" ? "fr" : "en"];
    const loc = () => (lang === "fr" ? "fr-FR" : "en-US");
    const day = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
    const todayIso = () => { const n = new Date(); return [n.getFullYear(), String(n.getMonth() + 1).padStart(2, "0"), String(n.getDate()).padStart(2, "0")].join("-"); };
    const typeClass = (ty) => "cal-type t-" + String(ty).toLowerCase().replace(/[^a-z]+/g, "-");

    const item = (e) => {
      const d = day(e.date);
      const status = e.status === "Cancelled" || e.status === "Done" ? `<span class="badge ${e.status === "Done" ? "active" : "inactive"}">${esc(t()[e.status])}</span>` : "";
      const isToday = e.date === todayIso() ? `<span class="badge pending">${esc(t().today)}</span>` : "";
      return `<li class="cal-item${e.status === "Cancelled" ? " cancelled" : ""}">
        <div class="cal-date" aria-hidden="true">
          <span class="cal-dow">${esc(d.toLocaleDateString(loc(), { weekday: "short" }))}</span>
          <span class="cal-day">${d.getDate()}</span>
          <span class="cal-mon">${esc(d.toLocaleDateString(loc(), { month: "short" }))}</span>
        </div>
        <div class="cal-body">
          <p class="cal-meta"><span class="${typeClass(e.type)}">${esc(t()[e.type] || e.type)}</span> ${isToday} ${status}</p>
          <h3>${esc(e.title)}</h3>
          <p class="cal-when">${esc(d.toLocaleDateString(loc(), { weekday: "long", year: "numeric", month: "long", day: "numeric" }))}${e.location ? " · " + esc(e.location) : ""}</p>
        </div>
      </li>`;
    };
    const months = (evs) => {
      const groups = [];
      evs.forEach((e) => {
        const key = e.date.slice(0, 7);
        let g = groups.find((x) => x.key === key);
        if (!g) groups.push((g = { key, items: [] }));
        g.items.push(e);
      });
      return groups.map((g) => `<h2 class="cal-month">${esc(day(g.key + "-01").toLocaleDateString(loc(), { month: "long", year: "numeric" }))}</h2><ul class="cal-items">${g.items.map(item).join("")}</ul>`).join("");
    };
    const grid = () => {
      const now = todayIso();
      if (!gridMonth) {
        const next = events.find((e) => e.date >= now);
        gridMonth = (next ? next.date : now).slice(0, 7);
      }
      const [y, m] = gridMonth.split("-").map(Number);
      const first = new Date(y, m - 1, 1);
      const lead = (first.getDay() + 6) % 7;            // weeks start on Monday
      const days = new Date(y, m, 0).getDate();
      const iso = (d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const heads = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc(), { weekday: "short" }));
      let cells = "";
      for (let i = 0; i < lead; i++) cells += `<div class="cal-cell empty"></div>`;
      for (let d = 1; d <= days; d++) {
        const key = iso(d), evs = events.filter((e) => e.date === key);
        const cls = ["cal-cell", key === now ? "today" : "", evs.length ? "has" : "", key === pickedDay ? "picked" : ""].join(" ");
        const chips = evs.map((e) => `<span class="${typeClass(e.type)} cal-chip">${esc(e.title)}</span>`).join("");
        cells += evs.length
          ? `<button type="button" class="${cls}" data-day="${key}" aria-label="${esc(day(key).toLocaleDateString(loc(), { day: "numeric", month: "long" }))}: ${evs.length}"><span class="cal-num">${d}</span><span class="cal-dots">${evs.map((e) => `<i class="${typeClass(e.type)}"></i>`).join("")}</span>${chips}</button>`
          : `<div class="${cls}"><span class="cal-num">${d}</span></div>`;
      }
      const picked = pickedDay && pickedDay.startsWith(gridMonth) ? events.filter((e) => e.date === pickedDay) : null;
      gridEl.innerHTML = `
        <div class="cal-nav">
          <button type="button" class="btn btn-outline btn-sm" data-move="-1" aria-label="${esc(t().prev)}">‹</button>
          <h2 class="cal-month">${esc(first.toLocaleDateString(loc(), { month: "long", year: "numeric" }))}</h2>
          <button type="button" class="btn btn-outline btn-sm" data-move="1" aria-label="${esc(t().next)}">›</button>
          <button type="button" class="btn btn-outline btn-sm" data-move="0">${esc(t().thisMonth)}</button>
        </div>
        <div class="cal-grid">${heads.map((h) => `<div class="cal-head">${esc(h)}</div>`).join("")}${cells}</div>
        ${picked ? (picked.length ? `<ul class="cal-items cal-picked">${picked.map(item).join("")}</ul>` : "") : `<p class="muted small cal-hint">${esc(t().pick)}</p>`}`;
    };
    gridEl.addEventListener("click", (e) => {
      const mv = e.target.closest("[data-move]");
      if (mv) {
        const n = Number(mv.dataset.move);
        if (n === 0) { gridMonth = todayIso().slice(0, 7); }
        else { const [y, m] = gridMonth.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); gridMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
        pickedDay = null; render(); return;
      }
      const cell = e.target.closest("[data-day]");
      if (cell) { pickedDay = cell.dataset.day === pickedDay ? null : cell.dataset.day; render(); }
    });
    document.querySelectorAll(".cal-seg [data-view]").forEach((b) => b.addEventListener("click", () => {
      view = b.dataset.view;
      try { localStorage.setItem("arm-cal-view", view); } catch (_) {}
      render();
    }));

    const render = () => {
      document.querySelectorAll(".cal-seg [data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
      if (events === null) return;
      if (events === false) { list.innerHTML = `<p class="muted">${esc(t().err)}</p>`; return; }
      gridEl.hidden = view !== "grid";
      list.hidden = view === "grid";
      if (view === "grid") { pastBtn.hidden = true; grid(); return; }
      const now = todayIso();
      const upcoming = events.filter((e) => e.date >= now);
      const past = events.filter((e) => e.date < now).reverse();
      list.innerHTML = (upcoming.length ? months(upcoming) : `<p class="muted">${esc(t().none)}</p>`) +
        (showPast && past.length ? `<h2 class="cal-month cal-past-title">${esc(t().past)}</h2>${months(past)}` : "");
      pastBtn.hidden = !past.length;
      pastBtn.textContent = showPast ? t().hidePast : t().showPast;
    };
    rerender.push(render);
    pastBtn.addEventListener("click", () => { showPast = !showPast; render(); });
    fetch(API + (API.includes("?") ? "&" : "?") + "action=calendar").then((r) => r.json())
      .then((d) => { events = d.status === "ok" ? d.events || [] : false; render(); })
      .catch(() => { events = false; render(); });
  }

  // ---------------------------------------------------------
  // Register page
  // ---------------------------------------------------------
  if (PAGE === "register") {
    const form = $("#regForm");
    const status = $("#formStatus");
    const btn = $("#submitBtn");
    const result = $("#regResult");
    const setError = makeErrors(form);
    let member = null;

    const spSelect = $("#subpref");
    SUBPREFS.forEach((n) => spSelect.add(new Option(n, n)));
    // Coming from a sub-prefecture page (register.html?sp=dounet) preselects it
    const fromSp = new URLSearchParams(location.search).get("sp");
    const match = SUBPREFS.find((n) => slugOf(n) === fromSp);
    if (match) spSelect.value = match;

    // Districts of the chosen sub-prefecture (from the DataSheet's Districts tab)
    let districts = {};
    const distSelect = $("#district");
    const fillDistricts = () => {
      const list = districts[spSelect.value] || [];
      while (distSelect.options.length > 1) distSelect.remove(1);
      list.forEach((d) => distSelect.add(new Option(d.name, d.name)));
      $("#districtField").hidden = !list.length;
    };
    spSelect.addEventListener("change", fillDistricts);
    // Sub-prefectures of the whole Mamou region (Mamou, Timbo, Dalaba, Pita), grouped by prefecture
    const fillRegion = (region) => {
      if (!region || !region.length) return;
      const keep = spSelect.value;
      while (spSelect.options.length > 1) spSelect.remove(1);
      spSelect.querySelectorAll("optgroup").forEach((g) => g.remove());
      const order = ["Mamou", "Timbo", "Dalaba", "Pita"];
      const prefs = [...new Set(region.map((r) => r.prefecture || "Other"))].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
      prefs.forEach((p) => {
        const g = document.createElement("optgroup");
        g.label = (lang === "fr" ? "Préfecture de " : "Prefecture of ") + p;
        region.filter((r) => (r.prefecture || "Other") === p).forEach((r) => g.appendChild(new Option(r.name, r.name)));
        spSelect.appendChild(g);
      });
      const m = region.find((r) => slugOf(r.name) === fromSp);
      spSelect.value = keep || (m ? m.name : "");
    };
    if (API) fetch(API + (API.includes("?") ? "&" : "?") + "action=districts").then((r) => r.json())
      .then((d) => { districts = d.districts || {}; fillRegion(d.region); fillDistricts(); }).catch(() => {});

    const stateSelect = $("#state");
    STATES.forEach((s) => stateSelect.add(new Option(s, s)));
    stateSelect.add(new Option("Outside the U.S. / Hors des États-Unis", "Outside U.S."));
    formatPhoneInput($("#phone"));

    const showResult = () => {
      if (!member) return;
      $("#regWelcome").textContent = msg().welcomeNew(member.firstName);
      const statusLink = document.querySelector('#regResult a[href^="member.html"]');
      if (statusLink) statusLink.href = "member.html?id=" + encodeURIComponent(member.memberId);
      fillCard("reg", member);
    };
    rerender.push(showResult);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const d = Object.fromEntries(["firstName", "lastName", "knownAs", "phone", "group", "subpref", "district", "state", "website"].map((k) => [k, String(fd.get(k) || "").trim()]));
      d.texts = fd.get("texts") === "Yes" ? "Yes" : "No";
      const errs = {
        firstName: !d.firstName && msg().required,
        lastName: !d.lastName && msg().required,
        phone: d.phone.replace(/\D/g, "").length < 10 && msg().phone,
        state: !d.state && msg().required,
        group: !d.group && msg().group,
        subpref: !d.subpref && msg().subpref,
      };
      Object.entries(errs).forEach(([k, v]) => setError(k, v));
      notice(status, "", "");
      if (Object.values(errs).some(Boolean)) {
        form.querySelector(".invalid input, .invalid select")?.focus();
        return;
      }
      if (!API) return notice(status, "err", msg().noApi);

      btn.disabled = true;
      const label = btn.innerHTML;
      btn.textContent = msg().sending;
      try {
        const out = await api({ action: "register", ...d });
        if (out.status === "ok") {
          member = { ...d, firstName: titleCase(d.firstName), lastName: titleCase(d.lastName), memberId: out.memberId,
            prefecture: out.prefecture || "", cardCode: out.cardCode || "", knownAs: out.knownAs || (d.knownAs ? titleCase(d.knownAs) : "") };
          // Read the new row back from the Google Sheet so the card shows exactly what was saved
          try {
            const saved = await api({ action: "lookup", memberId: out.memberId, phone: d.phone });
            if (saved.status === "ok") member = saved.member;
          } catch (_) {}
          showResult();
          form.hidden = true;
          result.hidden = false;
          result.focus();
        } else if (out.status === "duplicate") {
          notice(status, "warn", msg().dup(esc(out.memberId || "")));
        } else {
          notice(status, "err", msg().err);
        }
      } catch (_) {
        notice(status, "err", msg().err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });

    $("#registerAnother").addEventListener("click", () => {
      member = null;
      form.reset();
      result.hidden = true;
      form.hidden = false;
      fillDistricts();
      $("#firstName").focus();
    });
  }

  // ---------------------------------------------------------
  // Member login / status page
  // ---------------------------------------------------------
  if (PAGE === "member") {
    const form = $("#loginForm");
    const status = $("#loginStatus");
    const btn = $("#loginBtn");
    const setError = makeErrors(form);
    const KEY = "arm-member";
    const LOGIN_KEY = "arm-member-login";   // kept only for this browser tab, cleared on log out
    let member = null, login = null;
    try { member = JSON.parse(sessionStorage.getItem(KEY) || "null"); login = JSON.parse(sessionStorage.getItem(LOGIN_KEY) || "null"); } catch (_) {}

    // The card always comes from the Google Sheet: refresh it on load and when the page comes back into view
    let lastRefresh = 0;
    async function refresh() {
      if (!member || !login || !API || Date.now() - lastRefresh < 30000) return;
      lastRefresh = Date.now();
      try {
        const out = await api({ action: "lookup", memberId: login.id, phone: login.phone });
        if (out.status === "ok") {
          member = out.member;
          try { sessionStorage.setItem(KEY, JSON.stringify(member)); } catch (_) {}
          showDash();
        } else if (out.status === "not_found") {
          member = null; login = null;
          try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(LOGIN_KEY); } catch (_) {}
          showDash();
        }
      } catch (_) {}
    }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });

    formatPhoneInput($("#loginPhone"));
    // Arriving from registration: member ID already filled in
    const idFromUrl = new URLSearchParams(location.search).get("id");
    if (idFromUrl && !member) { $("#memberId").value = idFromUrl; $("#loginPhone").focus(); }

    function showDash() {
      $("#loginView").hidden = !!member;
      $("#dashView").hidden = !member;
      if (!member) return;
      const st = ["Pending", "Active", "Inactive"].includes(member.memberStatus) ? member.memberStatus : "Pending";
      $("#dashWelcome").textContent = msg().welcomeBack(member.firstName);
      const badge = $("#dashBadge");
      badge.className = "badge " + st.toLowerCase();
      badge.textContent = msg().status[st];
      $("#dashStatusText").textContent = msg().statusText[st];
      $("#dId").textContent = member.memberId;
      $("#dName").textContent = `${member.firstName} ${member.lastName}`;
      $("#dGroup").textContent = groupText(member.group);
      $("#dSp").textContent = member.subpref || "—";
      $("#dDist").textContent = member.district || "—";
      $("#dKnown").textContent = member.knownAs || "—";
      $("#dPref").textContent = member.prefecture || "—";
      $("#dCode").textContent = member.cardCode || "—";
      $("#dState").textContent = stateText(member.state);
      $("#dPhone").textContent = "•••-•••-" + member.phoneLast4;
      const since = new Date(member.registeredAt);
      $("#dSince").textContent = isNaN(since) ? "—" : since.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { year: "numeric", month: "long", day: "numeric" });
      fillCard("dash", member);
    }
    rerender.push(showDash);
    refresh();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = $("#memberId").value.trim();
      const phone = $("#loginPhone").value.trim();
      const errs = {
        memberId: !/\d/.test(id) && msg().memberId,
        phone: phone.replace(/\D/g, "").length < 10 && msg().phone,
      };
      Object.entries(errs).forEach(([k, v]) => setError(k, v));
      notice(status, "", "");
      if (Object.values(errs).some(Boolean)) {
        form.querySelector(".invalid input")?.focus();
        return;
      }
      if (!API) return notice(status, "err", msg().noApi);

      btn.disabled = true;
      const label = btn.innerHTML;
      btn.textContent = msg().sending;
      try {
        const out = await api({ action: "lookup", memberId: id, phone });
        if (out.status === "ok") {
          member = out.member;
          login = { id, phone };
          lastRefresh = Date.now();
          try { sessionStorage.setItem(KEY, JSON.stringify(member)); sessionStorage.setItem(LOGIN_KEY, JSON.stringify(login)); } catch (_) {}
          form.reset();
          showDash();
        } else if (out.status === "too_many") {
          notice(status, "err", msg().tooMany);
        } else if (out.status === "not_found") {
          notice(status, "err", msg().notFound);
        } else {
          notice(status, "err", msg().err);
        }
      } catch (_) {
        notice(status, "err", msg().err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });

    $("#logoutBtn").addEventListener("click", () => {
      member = null; login = null;
      try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(LOGIN_KEY); } catch (_) {}
      showDash();
      $("#memberId").focus();
    });
  }

  // ---------------------------------------------------------
  // Numbers shown in the visitor's language (e.g. 30,534 / 30 534)
  // ---------------------------------------------------------
  const nums = document.querySelectorAll(".num[data-n]");
  if (nums.length) {
    rerender.push(() => nums.forEach((el) => {
      const n = Number(el.dataset.n);
      const loc = lang === "fr" ? "fr-FR" : "en-US";
      el.textContent = "pct" in el.dataset
        ? n.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (lang === "fr" ? " %" : "%")
        : n.toLocaleString(loc);
    }));
  }

  // Shareable page link (without ".html")
  const linkBox = $("#pageLink");
  if (linkBox) {
    linkBox.value = location.origin + location.pathname.replace(/\.html$/, "");
    linkBox.addEventListener("focus", () => linkBox.select());
    const copyBtn = $("#copyLink");
    copyBtn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(linkBox.value); } catch (_) { linkBox.select(); document.execCommand("copy"); }
      const label = copyBtn.innerHTML;
      copyBtn.textContent = lang === "fr" ? "Copié" : "Copied";
      setTimeout(() => (copyBtn.innerHTML = label), 1600);
    });
  }

  // ---------------------------------------------------------
  // Federation + sub-prefecture pages: members per sub-prefecture
  // ---------------------------------------------------------
  if (PAGE === "federation" && API) {
    let by = null;
    const show = () => {
      if (!by) return;
      document.querySelectorAll(".sp-count[data-sp]").forEach((el) => (el.textContent = msg().members(by[el.dataset.sp] || 0)));
      const one = $("#spMembers");
      if (one) one.textContent = (by[document.body.dataset.sp] || 0).toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
    };
    rerender.push(show);
    fetch(API).then((r) => r.json()).then((d) => { by = d.bySubpref || {}; show(); }).catch(() => {});

    // District counts in the hierarchy (Districts tab)
    let dist = null;
    const showDist = () => {
      if (!dist) return;
      const fr = lang === "fr";
      const word = (n) => `${n} ${n === 1 ? "district" : "districts"}`;
      let total = 0;
      document.querySelectorAll(".sp-dist[data-sp]").forEach((el) => {
        const n = (dist[el.dataset.sp] || []).length; total += n;
        el.textContent = n ? word(n) : "";
      });
      const t = $("#fedDistricts");
      if (t && total) t.textContent = ` · ${total.toLocaleString(fr ? "fr-FR" : "en-US")} ${total === 1 ? "district" : "districts"}`;
    };
    if ($("#fedDistricts")) {
      rerender.push(showDist);
      fetch(API + (API.includes("?") ? "&" : "?") + "action=districts").then((r) => r.json())
        .then((d) => { dist = d.districts || {}; showDist(); }).catch(() => {});
    }
  }

  // ---------------------------------------------------------
  // Projects page (data comes from the Projects / Project Phases tabs)
  // ---------------------------------------------------------
  if (PAGE === "projects") {
    const list = $("#projectList");
    let projects = null;
    let failed = false;
    const locale = () => (lang === "fr" ? "fr-FR" : "en-US");
    const money = (n) => n.toLocaleString(locale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    const month = (s) => {
      const d = new Date(s + "T12:00:00");
      return isNaN(d) ? "" : d.toLocaleDateString(locale(), { month: "short", year: "numeric" });
    };
    const range = (a, b) => [month(a), month(b)].filter(Boolean).join(" – ");

    // A phase with no status in the sheet is worked out from its dates
    function phaseStatus(p) {
      if (p.status) return p.status;
      const today = new Date().toISOString().slice(0, 10);
      if (p.end && today > p.end) return "Done";
      if (p.start && today >= p.start) return "In progress";
      return "Not started";
    }
    const cls = (s) => ({ "Done": "done", "Completed": "done", "In progress": "current", "Delayed": "late", "On hold": "late" }[s] || "upcoming");

    function render() {
      if (failed) { list.innerHTML = `<p class="notice err">${msg().projErr}</p>`; return; }
      if (!projects) return;
      if (!projects.length) { list.innerHTML = `<p class="muted">${msg().projNone}</p>`; return; }
      const top = projects.filter((p) => !p.parent || !projects.some((q) => q.id === p.parent));
      const sectionsOf = (p) => projects.filter((q) => q.parent === p.id);
      const badge = (st) => `<span class="badge ${cls(st) === "done" ? "active" : cls(st) === "upcoming" ? "inactive" : "pending"}">${msg().pstatus[st] || esc(st)}</span>`;
      list.innerHTML = top.map((p) => {
        const subs = sectionsOf(p);
        const sections = subs.length ? `
          <div class="sections">${subs.map((sct) => {
            const sp = sct.goal ? Math.min(100, Math.round((sct.raised / sct.goal) * 100)) : 0;
            return `
            <section class="section-card">
              <div class="project-head">
                <h3>${esc(sct.title)}</h3>
                ${badge(sct.status)}
              </div>
              ${range(sct.start, sct.end) ? `<p class="project-dates">${range(sct.start, sct.end)}</p>` : ""}
              <p class="project-summary${sct.summary ? "" : " soon-text"}">${sct.summary ? esc(sct.summary) : msg().soonSection}</p>
              ${sct.goal ? `<div class="funding"><div class="progress"><span style="width:${sp}%"></span></div><p>${msg().raised(`<strong>${money(sct.raised)}</strong>`, money(sct.goal), sp)}</p></div>` : ""}
            </section>`;
          }).join("")}</div>` : "";
        const pct = p.goal ? Math.min(100, Math.round((p.raised / p.goal) * 100)) : 0;
        const funding = p.goal ? `
          <div class="funding">
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
            <p>${msg().raised(`<strong>${money(p.raised)}</strong>`, money(p.goal), pct)}</p>
          </div>` : "";
        const phases = (p.phases || []).length ? `
          <h3 class="phases-title">${msg().timeline}</h3>
          <ol class="phases">${p.phases.map((ph) => {
            const st = phaseStatus(ph);
            return `<li class="phase is-${cls(st)}"><span class="phase-dot"></span><strong>${esc(ph.name)}</strong><span class="phase-dates">${range(ph.start, ph.end)}</span><span class="phase-status">${msg().pstatus[st] || esc(st)}</span></li>`;
          }).join("")}</ol>` : "";
        return `
          <article class="project">
            <div class="project-head">
              <div>
                <h2>${esc(p.title)}</h2>
                ${range(p.start, p.end) ? `<p class="project-dates">${range(p.start, p.end)}</p>` : ""}
              </div>
              <span class="badge ${cls(p.status) === "done" ? "active" : cls(p.status) === "upcoming" ? "inactive" : "pending"}">${msg().pstatus[p.status] || esc(p.status)}</span>
            </div>
            <p class="project-summary${p.summary ? "" : " soon-text"}">${p.summary ? esc(p.summary) : msg().soonSection}</p>
            ${funding}
            ${sections}
            ${phases}
          </article>`;
      }).join("");
    }
    rerender.push(render);

    if (!API) { failed = true; render(); }
    else {
      fetch(API + (API.includes("?") ? "&" : "?") + "action=projects")
        .then((r) => r.json())
        .then((d) => { projects = d.projects || []; render(); })
        .catch(() => { failed = true; render(); });
    }
  }

  // ---------------------------------------------------------
  // Admin: finances (Google sign-in; bank transactions)
  // ---------------------------------------------------------
  if (PAGE === "admin") {
    const CLIENT_ID = (window.ARM_CONFIG && window.ARM_CONFIG.GOOGLE_CLIENT_ID) || "";
    const TOKEN_KEY = "arm-admin-token";
    const PAGE_SIZE = 50;
    const signInStatus = $("#signInStatus");
    const adminStatus = $("#adminStatus");
    let token = null, me = null, txs = [], categories = [], shown = PAGE_SIZE;
    const loc = () => (lang === "fr" ? "fr-FR" : "en-US");
    const usd = (n) => n.toLocaleString(loc(), { style: "currency", currency: "USD" });
    const day = (s) => new Date(s + "T12:00:00").toLocaleDateString(loc(), { year: "numeric", month: "short", day: "numeric" });
    const A = () => msg().admin;

    // Google ID tokens expire after about an hour
    const tokenValid = (t) => {
      if (!t) return false;
      if (t.startsWith("dev:") || t.startsWith("pw:")) return true;   // checked by the server
      try { return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000 > Date.now() + 30000; }
      catch (_) { return false; }
    };
    try { token = sessionStorage.getItem(TOKEN_KEY); } catch (_) {}
    if (!tokenValid(token)) token = null;

    async function call(action, extra) {
      const out = await api({ action, idToken: token, ...(extra || {}) });
      if (out.status === "unauthorized") { signOut(); notice(signInStatus, "err", A().expired); throw out; }
      if (out.status === "forbidden") { signOut(); notice(signInStatus, "err", A().forbidden(esc(out.email || ""))); throw out; }
      if (out.status === "not_configured") { signOut(); notice(signInStatus, "err", A().notConfigured); throw out; }
      return out;
    }

    async function onToken(t) {
      token = t;
      try { sessionStorage.setItem(TOKEN_KEY, t); } catch (_) {}
      notice(signInStatus, "", "");
      try {
        me = await call("adminMe");
        showAdmin();
        const canMembers = me.role === "Full" || me.role === "Members";
        const canFinance = me.role === "Full" || me.role === "Finance";
        $("#tabMembers").hidden = !canMembers;
        $("#tabFinance").hidden = !canFinance;
        $("#tabTexts").hidden = !canMembers;
        await openTab(canMembers ? "members" : "finance");
      } catch (_) { /* message already shown */ }
    }

    function signOut() {
      if (token && token.startsWith("pw:")) api({ action: "adminLogout", idToken: token }).catch(() => {});
      token = null; me = null; txs = []; members = [];
      Object.keys(loaded).forEach((k) => delete loaded[k]);
      try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
      if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
      $("#adminView").hidden = true;
      $("#signInView").hidden = false;
      $("#signOutBtn").hidden = true;
      $("#adminWho").textContent = "";
    }
    $("#signOutBtn").addEventListener("click", signOut);

    function showAdmin() {
      $("#signInView").hidden = true;
      $("#adminView").hidden = false;
      $("#signOutBtn").hidden = false;
      $("#adminWho").textContent = A().signedInAs(me.name, me.email);
    }

    // Google sign-in button
    if (CLIENT_ID) {
      const gsi = document.createElement("script");
      gsi.src = "https://accounts.google.com/gsi/client";
      gsi.async = true;
      gsi.onload = () => {
        google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => onToken(r.credential) });
        google.accounts.id.renderButton($("#gsiButton"), { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" });
      };
      document.head.appendChild(gsi);
    } else if (API !== "/mock-api") {
      notice(signInStatus, "warn", A().notConfigured);
    }
    // Shared admin username + password
    $("#pwForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = $("#adminUser").value.trim(), pass = $("#adminPass").value;
      if (!user || !pass) return notice(signInStatus, "err", A().pwMissing);
      const btn = $("#pwBtn"), label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = msg().sending;
      try {
        const out = await api({ action: "adminLogin", username: user, password: pass });
        $("#adminPass").value = "";
        if (out.status === "ok") return onToken(out.token);
        notice(signInStatus, "err", { wrong_password: A().pwWrong, too_many: A().pwLocked, password_off: A().pwOff }[out.status] || msg().err);
      } catch (_) {
        notice(signInStatus, "err", msg().err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });

    // Local test backend only: sign in without Google
    if (API === "/mock-api") {
      const dev = $("#devSignIn");
      dev.hidden = false;
      dev.addEventListener("click", () => onToken("dev:admin@example.com"));
    }

    // ----- tabs -----
    const loaded = {};
    async function openTab(name) {
      document.querySelectorAll(".tab").forEach((t) => {
        const on = t.dataset.tab === name;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", String(on));
      });
      $("#membersPanel").hidden = name !== "members";
      $("#financePanel").hidden = name !== "finance";
      $("#textsPanel").hidden = name !== "texts";
      if (!loaded[name]) {
        loaded[name] = true;
        try { await ({ members: loadMembers, finance: load, texts: loadTexts })[name](); } catch (e) { loaded[name] = false; throw e; }
      }
    }
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => openTab(t.dataset.tab).catch(() => {})));

    // ----- members -----
    let members = [], statuses = [], mShown = PAGE_SIZE;
    const mStatus = $("#membersStatus");
    const statusLabel = (st) => msg().status[st] || st;

    async function loadMembers() {
      const out = await call("adminMembers");
      members = (out.members || []).sort((a, b) => (a.memberId < b.memberId ? 1 : -1));   // newest first
      statuses = out.statuses || ["Pending", "Active", "Inactive"];
      fillSelect($("#mSubpref"), SUBPREFS.filter((n) => members.some((m) => m.subpref === n)));
      fillSelect($("#mStatus"), statuses);
      fillSelect($("#mGroup"), ["Male", "Female"]);
      [...$("#mStatus").options].slice(1).forEach((o) => (o.text = statusLabel(o.value)));
      [...$("#mGroup").options].slice(1).forEach((o) => (o.text = groupText(o.value)));
      mShown = PAGE_SIZE;
      renderMembers();
    }

    function filteredMembers() {
      const q = $("#mSearch").value.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, "");
      const sp = $("#mSubpref").value, st = $("#mStatus").value, gr = $("#mGroup").value;
      return members.filter((m) => (!sp || m.subpref === sp) && (!st || m.status === st) && (!gr || m.group === gr) &&
        (!q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && m.phone.replace(/\D/g, "").includes(qDigits))));
    }

    function renderMembers() {
      if (!me || !members) return;
      const all = members;
      const n = (st) => all.filter((m) => m.status === st).length;
      $("#mTotal").textContent = all.length.toLocaleString(loc());
      $("#mActive").textContent = n("Active");
      $("#mPending").textContent = n("Pending");
      $("#mInactive").textContent = n("Inactive");
      $("#mActivePct").textContent = all.length ? Math.round((n("Active") / all.length) * 100) + "%" : "";

      const rows = filteredMembers();
      $("#mBody").innerHTML = rows.slice(0, mShown).map((m) => `
        <tr data-id="${esc(m.memberId)}">
          <td class="nowrap" data-label="${esc(A().colId)}"><strong>${esc(m.memberId)}</strong></td>
          <td data-label="${esc(A().colName)}">${esc(m.firstName)} ${esc(m.lastName)}</td>
          <td class="nowrap" data-label="${esc(A().colPhone)}"><a href="tel:${esc(m.phone.replace(/[^\d+]/g, ""))}">${esc(m.phone)}</a></td>
          <td data-label="${esc(A().colGroup)}">${esc(groupText(m.group))}</td>
          <td data-label="${esc(A().colSp)}">${esc(m.subpref)}</td>
          <td data-label="${esc(A().colState)}">${esc(stateText(m.state))}</td>
          <td class="nowrap muted" data-label="${esc(A().colRegistered)}">${m.registeredAt ? new Date(m.registeredAt).toLocaleDateString(loc(), { year: "numeric", month: "short", day: "numeric" }) : ""}</td>
          <td data-label="${esc(A().colStatus)}"><select class="m-status st-${esc(m.status.toLowerCase())}" aria-label="${esc(A().colStatus)}">${statuses.map((st) => `<option value="${esc(st)}"${st === m.status ? " selected" : ""}>${esc(statusLabel(st))}</option>`).join("")}</select></td>
          <td data-label="${esc(A().colTexts)}">${m.texts === "Yes" ? A().yes : `<span class="muted">${A().no}</span>`}</td>
        </tr>`).join("");
      $("#mEmpty").hidden = rows.length > 0;
      $("#mMore").hidden = rows.length <= mShown;
      $("#mCount").textContent = rows.length ? A().showingMembers(Math.min(mShown, rows.length), rows.length) : "";
    }
    rerender.push(() => { if (me && loaded.members) loadMembersLabels(); });
    function loadMembersLabels() {
      [...$("#mStatus").options].slice(1).forEach((o) => (o.text = statusLabel(o.value)));
      [...$("#mGroup").options].slice(1).forEach((o) => (o.text = groupText(o.value)));
      renderMembers();
    }

    ["mSubpref", "mStatus", "mGroup"].forEach((id) => $("#" + id).addEventListener("change", () => { mShown = PAGE_SIZE; renderMembers(); }));
    $("#mSearch").addEventListener("input", () => { mShown = PAGE_SIZE; renderMembers(); });
    $("#mMore").addEventListener("click", () => { mShown += PAGE_SIZE; renderMembers(); });

    $("#mBody").addEventListener("change", async (e) => {
      if (!e.target.classList.contains("m-status")) return;
      const tr = e.target.closest("tr");
      const m = members.find((x) => x.memberId === tr.dataset.id);
      const before = m.status;
      m.status = e.target.value;
      try {
        const out = await call("adminSetStatus", { memberId: m.memberId, status: m.status });
        if (out.status !== "ok") throw out;
        notice(mStatus, "ok", A().statusSaved(esc(m.memberId), esc(statusLabel(m.status))));
        renderMembers();
      } catch (_) {
        m.status = before;
        if (me) { renderMembers(); notice(mStatus, "err", A().saveErr); }
      }
    });

    // Export the filtered list (cells starting with = + - @ are made safe for Excel)
    $("#mExport").addEventListener("click", () => {
      const cell = (v) => {
        let s = String(v ?? "");
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const head = ["Member ID", "First Name", "Last Name", "Phone", "Group", "Sub-prefecture", "State of Residence", "Registered", "Status", "Texts"];
      const lines = [head.join(",")].concat(filteredMembers().map((m) =>
        [m.memberId, m.firstName, m.lastName, m.phone, m.group, m.subpref, m.state, (m.registeredAt || "").slice(0, 10), m.status, m.texts].map(cell).join(",")));
      const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `arm-members-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    // ----- texts -----
    // GSM-7 alphabet: messages using only these characters fit 160 per SMS; anything else (ê, ç, emoji…) means 70
    const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    const GSM_EXT = "^{}\\[~]|€";
    const tStatus = $("#textsStatus");
    let textLog = [], textFooter = "", textsReady = false;

    async function loadTexts() {
      if (!loaded.members) { loaded.members = true; await loadMembers(); }
      const out = await call("adminTexts");
      textsReady = !!out.configured;
      textLog = out.log || [];
      textFooter = out.footer || "";
      $("#textsSetup").hidden = textsReady;
      $("#tFooter").textContent = textFooter.trim().replace(/\n+/g, " ");
      fillSelect($("#tGroup"), ["Male", "Female"]);
      fillSelect($("#tSubpref"), SUBPREFS.filter((n) => members.some((m) => m.subpref === n)));
      fillSelect($("#tState"), [...new Set(members.map((m) => m.state).filter(Boolean))].sort());
      renderTexts();
    }

    function textRecipients() {
      const g = $("#tGroup").value, sp = $("#tSubpref").value, st = $("#tState").value;
      const match = (m) => m.status === "Active" && (!g || m.group === g) && (!sp || m.subpref === sp) && (!st || m.state === st);
      const active = members.filter(match);
      return { yes: active.filter((m) => m.texts === "Yes"), other: active.filter((m) => m.texts !== "Yes").length };
    }

    // Size of one member's text: {first} counted as a typical first name
    function smsSize() {
      const body = $("#tMessage").value.trim().replace(/\{first\}/gi, "Mamadou") + textFooter;
      const unicode = [...body].some((c) => !GSM.includes(c) && !GSM_EXT.includes(c));
      const len = unicode ? body.length : [...body].reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
      const seg = unicode ? (len <= 70 ? 1 : Math.ceil(len / 67)) : (len <= 160 ? 1 : Math.ceil(len / 153));
      return { len, seg, unicode };
    }

    function renderTexts() {
      if (!me || !loaded.texts) return;
      const r = textRecipients(), size = smsSize();
      $("#tAudience").innerHTML = A().tAudience(r.yes.length, r.other);
      $("#tCount").textContent = A().tCount(size.len, size.seg, size.seg * r.yes.length) + (size.unicode ? A().tUnicode : "");
      $("#tSendBtn").textContent = A().tSendBtn(r.yes.length);
      $("#tSendBtn").disabled = !r.yes.length;
      [...$("#tGroup").options].slice(1).forEach((o) => (o.text = groupText(o.value)));
      [...$("#tState").options].slice(1).forEach((o) => (o.text = stateText(o.value)));
      $("#tBody").innerHTML = textLog.map((t) => `
        <tr>
          <td class="nowrap muted" data-label="${esc(A().colDate)}">${t.sentAt ? new Date(t.sentAt).toLocaleString(loc(), { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}<br><small>${esc(t.sentBy)}</small></td>
          <td class="t-msg" data-label="Message">${esc(t.message)}</td>
          <td data-label="${esc(A().tColTo)}">${esc(t.audience)}</td>
          <td class="r nowrap" data-label="${esc(A().tColResult)}"${t.errors ? ` title="${esc(t.errors)}"` : ""}><span class="${t.failed ? "neg" : "pos"}">${A().tResult(t.sent, t.recipients)}</span></td>
        </tr>`).join("");
      $("#tEmpty").hidden = textLog.length > 0;
    }
    rerender.push(renderTexts);
    ["tGroup", "tSubpref", "tState"].forEach((id) => $("#" + id).addEventListener("change", renderTexts));
    $("#tMessage").addEventListener("input", renderTexts);
    formatPhoneInput($("#tTestPhone"));

    async function sendText(test) {
      const message = $("#tMessage").value.trim();
      if (!message) return notice(tStatus, "err", A().tEmptyMsg);
      if (!textsReady) return notice(tStatus, "err", A().tNotSetUp);
      const extra = { message };
      if (test) {
        extra.testPhone = $("#tTestPhone").value.trim();
        if (extra.testPhone.replace(/\D/g, "").length < 10) { $("#tTestPhone").focus(); return notice(tStatus, "err", A().tTestPhone); }
      } else {
        const n = textRecipients().yes.length;
        if (!n || !confirm(A().tConfirm(n, smsSize().seg))) return;
        Object.assign(extra, { group: $("#tGroup").value, subpref: $("#tSubpref").value, state: $("#tState").value });
      }
      const btn = test ? $("#tTestBtn") : $("#tSendBtn"), label = btn.innerHTML;
      $("#tTestBtn").disabled = $("#tSendBtn").disabled = true;
      btn.textContent = A().tSending;
      notice(tStatus, "", "");
      try {
        const out = await call("adminSendText", extra);
        if (out.status === "ok") {
          const problems = (out.errors || []).length ? A().tErrors(esc(out.errors.join("; "))) : "";
          if (test) {
            notice(tStatus, out.sent ? "ok" : "err", (out.sent ? A().tTestSent(esc(extra.testPhone)) : "") + problems);
          } else {
            notice(tStatus, out.failed ? "warn" : "ok", A().tSent(out.sent, out.recipients) + (out.optedOut ? A().tOptedOut(out.optedOut) : "") + problems);
            $("#tMessage").value = "";
            await loadMembers();            // the Texts column may have changed (STOP replies)
            await loadTexts();
          }
        } else {
          notice(tStatus, "err", { not_set_up: A().tNotSetUp, busy: A().tBusy }[out.status] || esc(out.message || msg().err));
        }
      } catch (_) {
        if (me) notice(tStatus, "err", msg().err);
      } finally {
        btn.innerHTML = label;
        $("#tTestBtn").disabled = false;
        renderTexts();
      }
    }
    $("#textForm").addEventListener("submit", (e) => { e.preventDefault(); sendText(false); });
    $("#tTestBtn").addEventListener("click", () => sendText(true));

    // ----- finances -----
    async function load() {
      const out = await call("adminTransactions");
      txs = (out.transactions || []).sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? 1 : -1));
      categories = out.categories || [];
      fillSelect($("#fAccount"), [...new Set(txs.map((t) => t.account))]);
      fillSelect($("#fCategory"), categories, true);
      $("#atAccounts").innerHTML = [...new Set(["Cash", ...txs.map((t) => t.account)])].map((a) => `<option value="${esc(a)}"></option>`).join("");
      $("#atCat").innerHTML = catOptions("Uncategorized");
      shown = PAGE_SIZE;
      render();
    }

    function fillSelect(sel, values, translate) {
      const keep = sel.value;
      while (sel.options.length > 1) sel.remove(1);
      values.forEach((v) => sel.add(new Option(translate ? A().cat(v) : v, v)));
      sel.value = values.includes(keep) ? keep : "";
    }

    function period() {
      const now = new Date(), y = now.getFullYear(), m = now.getMonth();
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      switch ($("#fPeriod").value) {
        case "month": return [iso(new Date(y, m, 1)), null];
        case "lastMonth": return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
        case "3months": return [iso(new Date(y, m - 2, 1)), null];
        case "year": return [iso(new Date(y, 0, 1)), null];
        default: return [null, null];
      }
    }

    function filtered() {
      const [from, to] = period();
      const acc = $("#fAccount").value, cat = $("#fCategory").value;
      const q = $("#fSearch").value.trim().toLowerCase();
      return txs.filter((t) => (!from || t.date >= from) && (!to || t.date <= to) &&
        (!acc || t.account === acc) && (!cat || t.category === cat || (t.splits || []).some((l) => l.category === cat)) &&
        (!q || t.description.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)));
    }

    function render() {
      if (!me) return;
      $("#adminWho").textContent = A().signedInAs(me.name, me.email);
      const rows = filtered();
      const inn = rows.filter((t) => t.amount > 0), out = rows.filter((t) => t.amount < 0);
      const sum = (a) => a.reduce((s, t) => s + t.amount, 0);
      const net = sum(rows);
      $("#kIn").textContent = usd(sum(inn));
      $("#kOut").textContent = usd(Math.abs(sum(out)));
      $("#kNet").textContent = usd(net);
      $("#kNet").className = net < 0 ? "neg" : "pos";
      $("#kInCount").textContent = A().count(inn.length);
      $("#kOutCount").textContent = A().count(out.length);

      // Latest known balance (checking-account rows carry the running balance)
      const acc = $("#fAccount").value;
      const withBal = txs.find((t) => t.balance !== null && (!acc || t.account === acc));
      $("#kBalance").textContent = withBal ? usd(withBal.balance) : "–";
      $("#kBalanceAsOf").textContent = withBal ? A().asOf(day(withBal.date)) : A().noBalance;

      $("#txBody").innerHTML = rows.slice(0, shown).map(txRows).join("");
      $("#txEmpty").hidden = rows.length > 0;
      $("#txMore").hidden = rows.length <= shown;
      $("#txCount").textContent = rows.length ? A().showing(Math.min(shown, rows.length), rows.length) : "";
    }
    rerender.push(() => { if (me) { fillSelect($("#fCategory"), categories, true); render(); } });

    ["fPeriod", "fAccount", "fCategory"].forEach((id) => $("#" + id).addEventListener("change", () => { shown = PAGE_SIZE; render(); }));
    $("#fSearch").addEventListener("input", () => { shown = PAGE_SIZE; render(); });
    $("#txMore").addEventListener("click", () => { shown += PAGE_SIZE; render(); });

    // ----- one transaction (+ its split lines, or the split editor) -----
    const catOptions = (sel) => categories.map((c) => `<option value="${esc(c)}"${c === sel ? " selected" : ""}>${esc(A().cat(c))}</option>`).join("");
    let editing = null;      // id of the transaction whose split is being edited
    let draft = [];          // [{ amount: "12.50" (always positive here), category, notes }]

    function txRows(t) {
      const split = t.splits && t.splits.length > 0;
      const catCell = split
        ? `<span class="split-badge">${A().splitLines(t.splits.length)}</span> <button type="button" class="link-btn tx-split-btn">${A().editSplit}</button>`
        : `<select class="tx-cat" aria-label="${A().colCat}">${catOptions(t.category)}</select><button type="button" class="link-btn tx-split-btn" title="${esc(A().splitHelp)}">${A().split}</button>`;
      let html = `
        <tr class="tx-row${split ? " is-split" : ""}" data-id="${esc(t.id)}">
          <td class="nowrap" data-label="${A().colDate}">${day(t.date)}</td>
          <td class="desc" data-label="${A().colDesc}">${esc(t.description)}<small>${esc(t.account)}${t.type === "MANUAL" ? ` · <span class="manual-tag">${A().manual}</span> <button type="button" class="link-btn tx-delete">${A().deleteTx}</button>` : ""}</small></td>
          <td class="cat-cell" data-label="${A().colCat}">${catCell}</td>
          <td data-label="${A().colNotes}"><input class="tx-notes" type="text" maxlength="300" value="${esc(t.notes)}" aria-label="${A().colNotes}"></td>
          <td class="r nowrap ${t.amount < 0 ? "neg" : "pos"}" data-label="${A().colAmount}">${usd(t.amount)}</td>
          <td class="r nowrap muted" data-label="${A().colBalance}">${t.balance === null ? "" : usd(t.balance)}</td>
        </tr>`;
      if (editing === t.id) return html + splitEditor(t);
      if (split) {
        html += t.splits.map((l, i) => `
        <tr class="split-line${i === t.splits.length - 1 ? " last" : ""}" data-parent="${esc(t.id)}">
          <td class="split-gutter"></td>
          <td class="desc" data-label="${A().line(i + 1)}"><span class="split-arrow" aria-hidden="true"></span>${A().line(i + 1)}</td>
          <td data-label="${A().colCat}">${esc(A().cat(l.category))}</td>
          <td class="muted" data-label="${A().colNotes}">${esc(l.notes)}</td>
          <td class="r nowrap ${l.amount < 0 ? "neg" : "pos"}" data-label="${A().colAmount}">${usd(l.amount)}</td>
          <td></td>
        </tr>`).join("");
      }
      return html;
    }

    function splitEditor(t) {
      const lines = draft.map((l, i) => `
            <div class="split-edit-line" data-i="${i}">
              <span class="split-arrow" aria-hidden="true"></span>
              <label class="sr-only" for="sa${i}">${A().colAmount}</label>
              <span class="amt-wrap"><span>${t.amount < 0 ? "−$" : "$"}</span><input id="sa${i}" class="sp-amount" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(l.amount)}" placeholder="0.00"></span>
              <select class="sp-cat" aria-label="${A().colCat}">${catOptions(l.category)}</select>
              <input class="sp-notes" type="text" maxlength="300" value="${esc(l.notes)}" placeholder="${esc(A().colNotes)}" aria-label="${A().colNotes}">
              <button type="button" class="icon-btn sp-remove" aria-label="${esc(A().removeLine)}" title="${esc(A().removeLine)}"${draft.length <= 2 ? " disabled" : ""}>×</button>
            </div>`).join("");
      const wasSplit = t.splits && t.splits.length > 0;
      return `
        <tr class="split-editor" data-parent="${esc(t.id)}">
          <td colspan="6">
            <div class="split-box">
              <p class="split-title">${A().splitTitle(usd(t.amount))}</p>
              ${lines}
              <div class="split-actions">
                <button type="button" class="btn btn-outline btn-sm sp-add">${A().addLine}</button>
                <span class="split-remaining" aria-live="polite"></span>
                <span class="split-buttons">
                  ${wasSplit ? `<button type="button" class="link-btn sp-clear">${A().removeSplit}</button>` : ""}
                  <button type="button" class="btn btn-outline btn-sm sp-cancel">${A().cancel}</button>
                  <button type="button" class="btn btn-sm sp-save">${A().save}</button>
                </span>
              </div>
            </div>
          </td>
        </tr>`;
    }

    const cents = (v) => Math.round((parseFloat(v) || 0) * 100);
    function updateRemaining() {
      const row = document.querySelector(".split-editor");
      if (!row) return;
      const t = txs.find((x) => x.id === row.dataset.parent);
      const left = Math.abs(cents(t.amount)) - draft.reduce((s, l) => s + cents(l.amount), 0);
      const el = row.querySelector(".split-remaining");
      const empty = draft.some((l) => cents(l.amount) <= 0);
      el.textContent = left > 0 ? A().remaining(usd(left / 100)) : left < 0 ? A().over(usd(-left / 100)) : empty ? A().emptyLine : A().balanced;
      el.className = "split-remaining " + (left === 0 && !empty ? "ok" : "bad");
      row.querySelector(".sp-save").disabled = left !== 0 || empty;
    }

    function openEditor(t) {
      editing = t.id;
      draft = t.splits && t.splits.length
        ? t.splits.map((l) => ({ amount: (Math.abs(l.amount)).toFixed(2), category: l.category, notes: l.notes }))
        : [{ amount: Math.abs(t.amount).toFixed(2), category: t.category === "Split" ? "Uncategorized" : t.category, notes: "" },
           { amount: "", category: "Uncategorized", notes: "" }];
      render();
      updateRemaining();
      const second = document.querySelector('.split-editor .split-edit-line[data-i="0"] .sp-amount');
      if (second) second.focus();
    }

    function closeEditor() { editing = null; draft = []; render(); }

    async function saveSplit(t, lines) {
      const sign = t.amount < 0 ? -1 : 1;
      const payload = lines.map((l) => ({ amount: sign * cents(l.amount) / 100, category: l.category, notes: l.notes.trim() }));
      const out = await call("adminSplit", { id: t.id, lines: payload });
      if (out.status !== "ok") { notice(adminStatus, "err", esc(out.message || A().saveErr)); return false; }
      t.splits = payload.map((l, i) => ({ line: i + 1, ...l }));
      t.category = out.category;
      notice(adminStatus, "ok", payload.length ? A().splitSaved(esc(t.description)) : A().splitRemoved);
      return true;
    }

    // Buttons inside the table
    $("#txBody").addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const row = btn.closest("tr");
      const id = row.dataset.id || row.dataset.parent;
      const t = txs.find((x) => x.id === id);
      if (btn.classList.contains("tx-split-btn")) return openEditor(t);
      if (btn.classList.contains("tx-delete")) {
        if (!window.confirm(A().confirmDelete(t.description, usd(t.amount)))) return;
        try {
          const out = await call("adminDeleteTx", { id: t.id });
          if (out.status !== "ok") return notice(adminStatus, "err", esc(out.message || A().saveErr));
          txs = txs.filter((x) => x.id !== t.id);
          render();
          notice(adminStatus, "ok", A().deleted);
        } catch (_) { if (me) notice(adminStatus, "err", A().saveErr); }
        return;
      }
      if (btn.classList.contains("sp-add")) { draft.push({ amount: "", category: "Uncategorized", notes: "" }); render(); updateRemaining(); return; }
      if (btn.classList.contains("sp-remove")) { draft.splice(Number(btn.closest(".split-edit-line").dataset.i), 1); render(); updateRemaining(); return; }
      if (btn.classList.contains("sp-cancel")) return closeEditor();
      if (btn.classList.contains("sp-save") || btn.classList.contains("sp-clear")) {
        btn.disabled = true;
        try {
          if (await saveSplit(t, btn.classList.contains("sp-clear") ? [] : draft)) closeEditor();
          else btn.disabled = false;
        } catch (_) { if (me) { btn.disabled = false; notice(adminStatus, "err", A().saveErr); } }
      }
    });

    // Typing in the split editor (no re-render, so the cursor stays put)
    $("#txBody").addEventListener("input", (e) => {
      const line = e.target.closest(".split-edit-line");
      if (!line) return;
      const l = draft[Number(line.dataset.i)];
      if (e.target.classList.contains("sp-amount")) l.amount = e.target.value;
      if (e.target.classList.contains("sp-notes")) l.notes = e.target.value;
      updateRemaining();
    });

    // Save category / notes edits on a transaction (not inside the split editor)
    $("#txBody").addEventListener("change", async (e) => {
      const line = e.target.closest(".split-edit-line");
      if (line) {
        if (e.target.classList.contains("sp-cat")) draft[Number(line.dataset.i)].category = e.target.value;
        return;
      }
      const tr = e.target.closest("tr.tx-row");
      if (!tr) return;
      const t = txs.find((x) => x.id === tr.dataset.id);
      const before = { category: t.category, notes: t.notes };
      const sel = tr.querySelector(".tx-cat");
      if (sel) t.category = sel.value;
      t.notes = tr.querySelector(".tx-notes").value.trim();
      try {
        const out = await call("adminUpdate", { id: t.id, category: t.category, notes: t.notes });
        if (out.status !== "ok") throw out;
        notice(adminStatus, "", "");   
        tr.classList.add("saved");
        setTimeout(() => tr.classList.remove("saved"), 900);
      } catch (_) {
        Object.assign(t, before);
        if (me) { render(); notice(adminStatus, "err", A().saveErr); }
      }
    });

    // ----- add a transaction manually -----
    const addForm = $("#addTxForm");
    function toggleAddForm(open) {
      addForm.hidden = !open;
      $("#addTxBtn").setAttribute("aria-expanded", String(open));
      if (open) {
        const d = new Date();
        $("#atDate").value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        $("#atDesc").focus();
      }
    }
    $("#addTxBtn").addEventListener("click", () => toggleAddForm(addForm.hidden));
    $("#atCancel").addEventListener("click", () => { addForm.reset(); toggleAddForm(false); });
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = parseFloat($("#atAmount").value);
      const out_ = addForm.querySelector('input[name="atDir"]:checked').value === "out";
      const body = {
        date: $("#atDate").value,
        description: $("#atDesc").value.trim(),
        amount: Math.round((out_ ? -1 : 1) * amount * 100) / 100,
        account: $("#atAccount").value.trim() || "Cash",
        category: $("#atCat").value,
        notes: $("#atNotes").value.trim(),
      };
      if (!body.date || !body.description || !(amount > 0)) return notice(adminStatus, "err", A().addTxMissing);
      const save = $("#atSave");
      save.disabled = true;
      try {
        const out = await call("adminAddTx", body);
        if (out.status !== "ok") return notice(adminStatus, "err", esc(out.message || A().saveErr));
        notice(adminStatus, "ok", A().added(esc(body.description), usd(body.amount)));
        addForm.reset();
        toggleAddForm(false);
        await load();
      } catch (_) {
        if (me) notice(adminStatus, "err", A().saveErr);
      } finally {
        save.disabled = false;
      }
    });

    // Import a bank CSV
    $("#csvFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      notice(adminStatus, "warn", A().importing(esc(file.name)));
      try {
        const out = await call("adminImport", { csv: await file.text(), filename: file.name });
        if (out.status === "ok") {
          notice(adminStatus, "ok", A().imported(out.added, out.skipped, esc(out.format)));
          await load();
        } else {
          notice(adminStatus, "err", esc(out.message || A().importErr));
        }
      } catch (_) {
        if (me) notice(adminStatus, "err", A().importErr);
      }
    });

    if (token) onToken(token);
  }

  applyLang();
})();
