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
  `Afghanistan, Åland Islands, Albania, Algeria, American Samoa, Andorra, Angola, Anguilla, Antarctica, Antigua & Barbuda, Argentina, Armenia, Aruba, Australia, Austria, Azerbaijan, Bahamas, Bahrain, Bangladesh, Barbados, Belarus, Belgium, Belize, Benin, Bermuda, Bhutan, Bolivia, Bosnia & Herzegovina, Botswana, Bouvet Island, Brazil, British Indian Ocean Territory, British Virgin Islands, Brunei, Bulgaria, Burkina Faso, Burundi, Cambodia, Cameroon, Canada, Cape Verde, Caribbean Netherlands, Cayman Islands, Central African Republic, Chad, Chile, China, Christmas Island, Cocos  Islands, Colombia, Comoros, Congo - Brazzaville, Congo - Kinshasa, Cook Islands, Costa Rica, Côte d’Ivoire, Croatia, Cuba, Curaçao, Cyprus, Czechia, Denmark, Djibouti, Dominica, Dominican Republic, Ecuador, Egypt, El Salvador, Equatorial Guinea, Eritrea, Estonia, Eswatini, Ethiopia, Falkland Islands, Faroe Islands, Fiji, Finland, France, French Guiana, French Polynesia, French Southern Territories, Gabon, Gambia, Georgia, Germany, Ghana, Gibraltar, Greece, Greenland, Grenada, Guadeloupe, Guam, Guatemala, Guernsey, Guinea, Guinea-Bissau, Guyana, Haiti, Heard & McDonald Islands, Honduras, Hong Kong SAR China, Hungary, Iceland, India, Indonesia, Iran, Iraq, Ireland, Isle of Man, Israel, Italy, Jamaica, Japan, Jersey, Jordan, Kazakhstan, Kenya, Kiribati, Kuwait, Kyrgyzstan, Laos, Latvia, Lebanon, Lesotho, Liberia, Libya, Liechtenstein, Lithuania, Luxembourg, Macao SAR China, Madagascar, Malawi, Malaysia, Maldives, Mali, Malta, Marshall Islands, Martinique, Mauritania, Mauritius, Mayotte, Mexico, Micronesia, Moldova, Monaco, Mongolia, Montenegro, Montserrat, Morocco, Mozambique, Myanmar, Namibia, Nauru, Nepal, Netherlands, New Caledonia, New Zealand, Nicaragua, Niger, Nigeria, Niue, Norfolk Island, North Korea, North Macedonia, Northern Mariana Islands, Norway, Oman, Pakistan, Palau, Palestinian Territories, Panama, Papua New Guinea, Paraguay, Peru, Philippines, Pitcairn Islands, Poland, Portugal, Puerto Rico, Qatar, Réunion, Romania, Russia, Rwanda, Samoa, San Marino, São Tomé & Príncipe, Saudi Arabia, Senegal, Serbia, Seychelles, Sierra Leone, Singapore, Sint Maarten, Slovakia, Slovenia, Solomon Islands, Somalia, South Africa, South Georgia & South Sandwich Islands, South Korea, South Sudan, Spain, Sri Lanka, St. Barthélemy, St. Helena, St. Kitts & Nevis, St. Lucia, St. Martin, St. Pierre & Miquelon, St. Vincent & Grenadines, Sudan, Suriname, Svalbard & Jan Mayen, Sweden, Switzerland, Syria, Taiwan, Tajikistan, Tanzania, Thailand, Timor-Leste, Togo, Tokelau, Tonga, Trinidad & Tobago, Tunisia, Turkey, Turkmenistan, Turks & Caicos Islands, Tuvalu, U.S. Outlying Islands, U.S. Virgin Islands, Uganda, Ukraine, United Arab Emirates, United Kingdom, United States, Uruguay, Uzbekistan, Vanuatu, Vatican City, Venezuela, Vietnam, Wallis & Futuna, Western Sahara, Yemen, Zambia, Zimbabwe`.split(
    `, `
  )
