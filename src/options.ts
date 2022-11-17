export const frontend_libs = [
  [`Svelte`, `JavaScript`, `sveltejs/svelte`],
  [`React`, `JavaScript`, `facebook/react`],
  [`Vue`, `JavaScript`, `vuejs/vue`],
  [`Angular`, `JavaScript`, `angular/angular`],
  [`Polymer`, `JavaScript`, `polymer/polymer`],
  [`Ruby on Rails`, `Ruby`, `rails/rails`],
  [`ASP.net`, `C#`, `dotnet/aspnetcore`],
  [`Laravel`, `PHP`, `laravel/laravel`],
  [`Django`, `Python`, `django/django`],
  [`Express`, `JavaScript`, `expressjs/express`],
  [`Spring`, `JavaScript`, `spring-projects/spring-framework`],
  [`jQuery`, `JavaScript`, `jquery/jquery`],
  [`Flask`, `Python`, `pallets/flask`],
  [`Flutter`, `Dart`, `flutter/flutter`],
  [`Bootstrap`, `JavaScript`, `twbs/bootstrap`],
  [`Sinatra`, `Ruby`, `sinatra/sinatra`],
  [`Solid`, `JavaScript`, `solidjs/solid`],
  [`Ember JS`, `JavaScript`, `emberjs/ember.js`],
  [`Backbone`, `JavaScript`, `jashkenas/backbone`],
  [`Preact`, `JavaScript`, `preactjs/preact`],
].map(([label, lang, repo_handle]) => ({
  label,
  lang,
  repo_handle,
}))

export const ml_libs =
  `TensorFlow PyTorch scikit-learn Spark Torch Huggingface Keras Caffe Theano CNTK JAX fast.ai Lightning XGBoost MXNet`
    .split(` `)
    .map((label) => {
      const op = { label, disabled: false, preselected: false }
      if ([`CNTK`, `Theano`, `MXNet`].includes(label)) op.disabled = true
      if (label === `PyTorch`) op.preselected = true
      return op
    })

export const languages =
  `JavaScript TypeScript CoffeeScript Python Ruby C C# C++ Go Swift Java Rust Kotlin Haskell Scala Clojure Erlang Elixir F# Dart Elm Julia Lua R OCaml Perl PHP`.split(
    ` `
  )

// copied from https://emojipedia.org/food-drink
export const foods =
  `🍇 Grapes, 🍈 Melon, 🍉 Watermelon, 🍊 Tangerine, 🍋 Lemon, 🍌 Banana, 🍍 Pineapple, 🥭 Mango, 🍎 Red Apple, 🍏 Green Apple, 🍐 Pear, 🍑 Peach, 🍒 Cherries, 🍓 Strawberry, 🫐 Blueberries, 🥝 Kiwi, 🍅 Tomato, 🫒 Olive, 🥥 Coconut, 🥑 Avocado, 🍆 Eggplant, 🥔 Potato, 🥕 Carrot, 🌽 Ear of Corn, 🌶️ Hot Pepper, 🫑 Bell Pepper, 🥒 Cucumber, 🥬 Leafy Green, 🥦 Broccoli, 🧄 Garlic, 🧅 Onion, 🍄 Mushroom, 🥜 Peanuts`.split(
    `, `
  )

export const colors =
  `Red Green Blue Yellow Purple Pink Brown Black White Gray Orange Cyan Magenta Silver Gold Turquoise Violet Lime Indigo Navy`.split(
    ` `
  )

export const octicons =
  `accessibility-16 accessibility-inset-16 alert alert-16 alert-24 alert-fill-12 alert-fill-16 alert-fill-24 apps-16 archive archive-16 archive-24 arrow-both arrow-both-16 arrow-both-24 arrow-down arrow-down-16 arrow-down-24 arrow-down-left-24 arrow-down-right-24 arrow-left arrow-left-16 arrow-left-24 arrow-right arrow-right-16 arrow-right-24 arrow-small-down arrow-small-left arrow-small-right arrow-small-up arrow-switch-16 arrow-switch-24 arrow-up arrow-up-16 arrow-up-24 arrow-up-left-24 arrow-up-right-24 beaker beaker-16 beaker-24 bell bell-16 bell-24 bell-fill-16 bell-fill-24 bell-slash-16 bell-slash-24 blocked-16 blocked-24 bold bold-16 bold-24 book book-16 book-24 bookmark bookmark-16 bookmark-24 bookmark-fill-24 bookmark-slash-16 bookmark-slash-24 bookmark-slash-fill-24 briefcase briefcase-16 briefcase-24 broadcast broadcast-16 broadcast-24 browser browser-16 browser-24 bug-16 bug-24 cache-16 calendar calendar-16 calendar-24 check check-16 check-24 check-circle-16 check-circle-24 check-circle-fill-12 check-circle-fill-16 check-circle-fill-24 checkbox-16 checkbox-24 checklist checklist-16 checklist-24 chevron-down chevron-down-12 chevron-down-16 chevron-down-24 chevron-left chevron-left-16 chevron-left-24 chevron-right chevron-right-12 chevron-right-16 chevron-right-24 chevron-up chevron-up-16 chevron-up-24 circle-16 circle-24 circle-slash circle-slash-16 circle-slash-24 circuit-board clippy clock clock-16 clock-24 cloud-16 cloud-24 cloud-download cloud-offline-16 cloud-offline-24 cloud-upload code code-16 code-24 code-of-conduct-16 code-of-conduct-24 code-review-16 code-review-24 code-square-16 code-square-24 codescan-16 codescan-24 codescan-checkmark-16 codescan-checkmark-24 codespaces-16 codespaces-24 columns-16 columns-24 command-palette-16 command-palette-24 comment comment-16 comment-24 comment-discussion comment-discussion-16 comment-discussion-24 commit-24 container-16 container-24 copilot-16 copilot-24 copilot-48 copilot-96 copilot-error-16 copilot-warning-16 copy-16 copy-24 cpu-16 cpu-24 credit-card credit-card-16 credit-card-24 cross-reference-16 cross-reference-24 dash dash-16 dash-24 dashboard database database-16 database-24 dependabot-16 dependabot-24 desktop-download desktop-download-16 desktop-download-24 device-camera-16 device-camera-video device-camera-video-16 device-camera-video-24 device-desktop device-desktop-16 device-desktop-24 device-mobile device-mobile-16 device-mobile-24 diamond-16 diamond-24 diff diff-16 diff-24 diff-added diff-added-16 diff-ignored diff-ignored-16 diff-modified diff-modified-16 diff-removed diff-removed-16 diff-renamed diff-renamed-16 dot-16 dot-24 dot-fill-16 dot-fill-24 download-16 download-24 duplicate-16 duplicate-24 ellipsis ellipsis-16 eye eye-16 eye-24 eye-closed eye-closed-16 eye-closed-24 feed-discussion-16 feed-forked-16 feed-heart-16 feed-merged-16 feed-person-16 feed-repo-16 feed-rocket-16 feed-star-16 feed-tag-16 feed-trophy-16 file file-16 file-24 file-added-16 file-badge-16 file-binary file-binary-16 file-binary-24 file-code file-code-16 file-code-24 file-diff-16 file-diff-24 file-directory file-directory-16 file-directory-24 file-directory-fill-16 file-directory-fill-24 file-directory-open-fill-16 file-media file-media-24 file-moved-16 file-pdf file-removed-16 file-submodule file-submodule-16 file-submodule-24 file-symlink-directory file-symlink-file file-symlink-file-16 file-symlink-file-24 file-zip file-zip-16 file-zip-24 filter-16 filter-24 flame flame-16 flame-24 fold fold-16 fold-24 fold-down fold-down-16 fold-down-24 fold-up fold-up-16 fold-up-24 gear gear-16 gear-24 gift gift-16 gift-24 gist gist-secret git-branch git-branch-16 git-branch-24 git-commit git-commit-16 git-commit-24 git-compare git-compare-16 git-compare-24 git-merge git-merge-16 git-merge-24 git-merge-queue-16 git-pull-request git-pull-request-16 git-pull-request-24 git-pull-request-closed-16 git-pull-request-closed-24 git-pull-request-draft-16 git-pull-request-draft-24 github-action globe globe-16 globe-24 grabber grabber-16 grabber-24 graph graph-16 graph-24 hash-16 hash-24 heading-16 heading-24 heart heart-16 heart-24 heart-fill-16 heart-fill-24 history history-16 history-24 home home-16 home-24 home-fill-24 horizontal-rule horizontal-rule-16 horizontal-rule-24 hourglass-16 hourglass-24`.split(
    ` `
  )

// copied from https://github.com/umpirsky/country-list/blob/master/data/en/country.txt
export const countries =
  `Afghanistan (AF),Åland Islands (AX),Albania (AL),Algeria (DZ),American Samoa (AS),Andorra (AD),Angola (AO),Anguilla (AI),Antarctica (AQ),Antigua & Barbuda (AG),Argentina (AR),Armenia (AM),Aruba (AW),Australia (AU),Austria (AT),Azerbaijan (AZ),Bahamas (BS),Bahrain (BH),Bangladesh (BD),Barbados (BB),Belarus (BY),Belgium (BE),Belize (BZ),Benin (BJ),Bermuda (BM),Bhutan (BT),Bolivia (BO),Bosnia & Herzegovina (BA),Botswana (BW),Bouvet Island (BV),Brazil (BR),British Indian Ocean Territory (IO),British Virgin Islands (VG),Brunei (BN),Bulgaria (BG),Burkina Faso (BF),Burundi (BI),Cambodia (KH),Cameroon (CM),Canada (CA),Cape Verde (CV),Caribbean Netherlands (BQ),Cayman Islands (KY),Central African Republic (CF),Chad (TD),Chile (CL),China (CN),Christmas Island (CX),Cocos (Keeling) Islands (CC),Colombia (CO),Comoros (KM),Congo - Brazzaville (CG),Congo - Kinshasa (CD),Cook Islands (CK),Costa Rica (CR),Côte d’Ivoire (CI),Croatia (HR),Cuba (CU),Curaçao (CW),Cyprus (CY),Czechia (CZ),Denmark (DK),Djibouti (DJ),Dominica (DM),Dominican Republic (DO),Ecuador (EC),Egypt (EG),El Salvador (SV),Equatorial Guinea (GQ),Eritrea (ER),Estonia (EE),Eswatini (SZ),Ethiopia (ET),Falkland Islands (FK),Faroe Islands (FO),Fiji (FJ),Finland (FI),France (FR),French Guiana (GF),French Polynesia (PF),French Southern Territories (TF),Gabon (GA),Gambia (GM),Georgia (GE),Germany (DE),Ghana (GH),Gibraltar (GI),Greece (GR),Greenland (GL),Grenada (GD),Guadeloupe (GP),Guam (GU),Guatemala (GT),Guernsey (GG),Guinea (GN),Guinea-Bissau (GW),Guyana (GY),Haiti (HT),Heard & McDonald Islands (HM),Honduras (HN),Hong Kong SAR China (HK),Hungary (HU),Iceland (IS),India (IN),Indonesia (ID),Iran (IR),Iraq (IQ),Ireland (IE),Isle of Man (IM),Israel (IL),Italy (IT),Jamaica (JM),Japan (JP),Jersey (JE),Jordan (JO),Kazakhstan (KZ),Kenya (KE),Kiribati (KI),Kuwait (KW),Kyrgyzstan (KG),Laos (LA),Latvia (LV),Lebanon (LB),Lesotho (LS),Liberia (LR),Libya (LY),Liechtenstein (LI),Lithuania (LT),Luxembourg (LU),Macao SAR China (MO),Madagascar (MG),Malawi (MW),Malaysia (MY),Maldives (MV),Mali (ML),Malta (MT),Marshall Islands (MH),Martinique (MQ),Mauritania (MR),Mauritius (MU),Mayotte (YT),Mexico (MX),Micronesia (FM),Moldova (MD),Monaco (MC),Mongolia (MN),Montenegro (ME),Montserrat (MS),Morocco (MA),Mozambique (MZ),Myanmar (Burma) (MM),Namibia (NA),Nauru (NR),Nepal (NP),Netherlands (NL),New Caledonia (NC),New Zealand (NZ),Nicaragua (NI),Niger (NE),Nigeria (NG),Niue (NU),Norfolk Island (NF),North Korea (KP),North Macedonia (MK),Northern Mariana Islands (MP),Norway (NO),Oman (OM),Pakistan (PK),Palau (PW),Palestinian Territories (PS),Panama (PA),Papua New Guinea (PG),Paraguay (PY),Peru (PE),Philippines (PH),Pitcairn Islands (PN),Poland (PL),Portugal (PT),Puerto Rico (PR),Qatar (QA),Réunion (RE),Romania (RO),Russia (RU),Rwanda (RW),Samoa (WS),San Marino (SM),São Tomé & Príncipe (ST),Saudi Arabia (SA),Senegal (SN),Serbia (RS),Seychelles (SC),Sierra Leone (SL),Singapore (SG),Sint Maarten (SX),Slovakia (SK),Slovenia (SI),Solomon Islands (SB),Somalia (SO),South Africa (ZA),South Georgia & South Sandwich Islands (GS),South Korea (KR),South Sudan (SS),Spain (ES),Sri Lanka (LK),St. Barthélemy (BL),St. Helena (SH),St. Kitts & Nevis (KN),St. Lucia (LC),St. Martin (MF),St. Pierre & Miquelon (PM),St. Vincent & Grenadines (VC),Sudan (SD),Suriname (SR),Svalbard & Jan Mayen (SJ),Sweden (SE),Switzerland (CH),Syria (SY),Taiwan (TW),Tajikistan (TJ),Tanzania (TZ),Thailand (TH),Timor-Leste (TL),Togo (TG),Tokelau (TK),Tonga (TO),Trinidad & Tobago (TT),Tunisia (TN),Turkey (TR),Turkmenistan (TM),Turks & Caicos Islands (TC),Tuvalu (TV),U.S. Outlying Islands (UM),U.S. Virgin Islands (VI),Uganda (UG),Ukraine (UA),United Arab Emirates (AE),United Kingdom (GB),United States (US),Uruguay (UY),Uzbekistan (UZ),Vanuatu (VU),Vatican City (VA),Venezuela (VE),Vietnam (VN),Wallis & Futuna (WF),Western Sahara (EH),Yemen (YE),Zambia (ZM),Zimbabwe (ZW)`.split(
    `,`
  )
