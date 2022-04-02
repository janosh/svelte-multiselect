import { ProtoOption } from './lib'

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
].map(([label, lang]) => ({ label, lang }))

// prettier-ignore
export const ml_libs = [
  `TensorFlow`, `PyTorch`, `scikit-learn`, `Spark ML`, `Torch`, `Huggingface`, `Keras`, `Caffe`, `Theano`, `CNTK`,
].map((label) => {
  const op: ProtoOption = { label }
  if ([`CNTK`, `Theano`].includes(label)) op.disabled = true
  if (label   === `PyTorch`) op.preselected = true
  return op
})

// prettier-ignore
export const languages = [
  `JavaScript`, `TypeScript`, `CoffeeScript`, `Python`, `Ruby`, `C`, `C#`, `C++`, `Go`, `Swift`, `Java`, `Rust`, `Kotlin`, `Haskell`, `Scala`, `Clojure`, `Erlang`, `Elixir`, `F#`, `Dart`, `Elm`, `Julia`, `Lua`, `R`, `OCaml`, `Perl`, `PHP`
]

// prettier-ignore
export const fruits = [
  `Banana`, `Watermelon`, `Apple`, `Dates`, `Mango`, `Orange`, `Apricots`, `Avocado`, `Blackberries`, `Blackcurrant`, `Blueberries`, `Cherries`, `Coconut`, `Cranberries`, `Grapefruit`, `Grapes`, `Guava`, `Kiwi`, `Lemon`, `Lime`, `Lychee`, `Mandarin`, `Nectarine`, `Papaya`, `Passion fruit`, `Peach`, `Pear`, `Pineapple`, `Plum`, `Raspberry`, `Strawberry`, `Tangerine`
]

// prettier-ignore
export const colors = [
  `Red`, `Green`, `Blue`, `Yellow`, `Purple`, `Pink`, `Brown`, `Black`, `White`, `Gray`, `Orange`, `Cyan`, `Magenta`, `Silver`, `Gold`, `Turquoise`, `Violet`, `Lime`, `Indigo`, `Navy`,
].map(clr => ({label: clr, value: clr, preselected: [`Orange`, `Yellow`, `Green`].includes(clr)}))
