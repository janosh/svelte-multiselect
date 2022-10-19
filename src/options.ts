export const frontend_libs = [
  [`Svelte`, `JavaScript`, `sveltejs/svelte`],
  [`React`, `JavaScript`, `facebook/react`],
  [`Vue`, `JavaScript`, `vuejs/vue`],
  [`Angular`, `JavaScript`, `angular/angular`],
  [`Polymer`, `JavaScript`, `polymer/polymer`],
  [`Ruby on Rails`, `Ruby`, `rubyonrails/rails`],
  [`ASP.net`, `C#`, `aspnet/aspnet`],
  [`Laravel`, `PHP`, `laravel/laravel`],
  [`Django`, `Python`, `djangoproject/django`],
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

const red_vs_blue_pill_link = (text: string) =>
  `<a href="https://wikipedia.org/wiki/Red_pill_and_blue_pill">${text}</a>`

export const pills = [
  {
    label: `🔴  &ensp; Red Pill (${red_vs_blue_pill_link(`wait what?`)})`,
    value: `red pill`,
  },
  {
    label: `🔵  &ensp; Blue Pill (${red_vs_blue_pill_link(`more info!`)})`,
    value: `blue pill`,
  },
]
