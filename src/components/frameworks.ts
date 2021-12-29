import { ProtoOption } from '../lib'

export const webFrameworks = [
  `Svelte`,
  `React`,
  `Vue`,
  `Angular`,
  `Polymer`,
  `Ruby on Rails`,
  `ASP.net`,
  `Laravel`,
  `Django`,
  `Express`,
  `Spring`,
  `jQuery`,
  `Flask`,
  `Flutter`,
  `Bootstrap`,
  `Sinatra`,
]

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
