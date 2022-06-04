export const frontend_libs = [
  [`Svelte`, `JavaScript`],
  [`React`, `JavaScript`],
  [`Vue`, `JavaScript`],
  [`Angular`, `JavaScript`],
  [`Polymer`, `JavaScript`],
  [`Ruby on Rails`, `Ruby`],
  [`ASP.net`, `C#`],
  [`Laravel`, `PHP`],
  [`Django`, `Python`],
  [`Express`, `JavaScript`],
  [`Spring`, `JavaScript`],
  [`jQuery`, `JavaScript`],
  [`Flask`, `Python`],
  [`Flutter`, `Dart`],
  [`Bootstrap`, `JavaScript`],
  [`Sinatra`, `Ruby`],
].map(([label, lang]) => ({ label, value: label, lang }))

export const ml_libs =
  `TensorFlow PyTorch scikit-learn Spark ML Torch Huggingface Keras Caffe Theano CNTK`
    .split(` `)
    .map((label) => {
      const op = { label, value: label, disabled: false, preselected: false }
      if ([`CNTK`, `Theano`].includes(label)) op.disabled = true
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
  `Red Green Blue Yellow Purple Pink Brown Black White Gray Orange Cyan Magenta Silver Gold Turquoise Violet Lime Indigo Navy`
    .split(` `)
    .map((clr) => ({
      label: clr,
      value: clr,
      preselected: [`Orange`, `Yellow`, `Green`].includes(clr),
    }))

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
