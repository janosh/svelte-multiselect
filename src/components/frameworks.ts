import { ProtoOption } from '../lib'

export const webFrameworks = [
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

export const mlFrameworks = [
  `TensorFlow`,
  `PyTorch`,
  `scikit-learn`,
  `Spark ML`,
  `Torch`,
  `Huggingface`,
  `Keras`,
  `Caffe`,
  `Theano`,
  `CNTK`,
].map((label) => {
  const op: ProtoOption = { label }
  if ([`CNTK`, `Theano`].includes(label)) op.disabled = true
  if (label === `PyTorch`) op.preselected = true
  return op
})
