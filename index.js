var Neptune = require('./neptune-notebook.js/src/neptune.js');

var neptune = new Neptune();
neptune.addDocument('tutorial', __dirname + '/carousels_lecture.md', false);
neptune.writeHTML('tutorial',__dirname + '/carousels_lecture.html');
