var express = require('express');
var router = express.Router();

var quizController = require ('../controllers/quiz_controller');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.param('quizId', quizController.load);

router.get('/quizes', quizController.index);
router.get('/quizes/:quizId(\\d+)', quizController.show);
router.get('/quizes/:quizId(\\d+)/check', quizController.check);
router.get('/quizes/new', quizController.new);
router.post('/quizes', quizController.create);

/* GET author*/
router.get('/author', function(req, res, next) {
  res.render('author');
});

module.exports = router;
