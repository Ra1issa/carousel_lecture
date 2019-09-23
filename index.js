var Neptune = require('neptune-notebook');

const arr = ['carousels/lib/imparse.js','carousels/lib/carousels.js','carousels/lib/costs.js', 'carousels/lib/metric.js',
'carousels/lib/plot.js', 'carousels/lib/setup.js','carousels/lib/lodash.core.min.js',
'carousels/lib/jquery-2.1.1.js', 'carousels/lib/babel.min.js','carousels/lib/randomColor.min.js',
'carousels/lib/plotly-latest.min.js','carousels/lib/polynomium.js'];

var neptune = new Neptune();
neptune.addDocument('tutorial', __dirname + '/carousels_lecture.md', false, arr);
neptune.writeHTML('tutorial', 'carousels_lecture.html');
