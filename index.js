var Neptune = require('neptune-notebook');

const arr = ['carousels/lib/imparse.js','carousels/lib/carousels.js','carousels/lib/costs.js', 'carousels/lib/metric.js',
'carousels/lib/plot.js', 'carousels/lib/setup.js','lib/lodash.core.min.js',
'lib/jquery-2.1.1.js', 'lib/babel.min.js','lib/randomColor.min.js',
'lib/plotly-latest.min.js','lib/polynomium.js'];

var neptune = new Neptune();
neptune.addDocument('tutorial', __dirname + '/carousels_lecture.md', false, arr);
neptune.writeHTML('tutorial', 'carousels_lecture.html');
