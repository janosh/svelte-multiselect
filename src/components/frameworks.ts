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
].map((label) => ({ label, disabled: [`CNTK`, `Theano`].includes(label) }))
