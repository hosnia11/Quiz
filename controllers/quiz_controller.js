
var models = require('../models');

//load

exports.load = function(req, res, next) {
	models.Quiz.findById(quizId).then(function(quiz){
		if(quiz){
			req.quiz = quiz;
			next();
		}else{
			next(new Error ('No existe quizId=' + quizId));
		}
	}).catch(function(error){
		next(error);
	});
};


// GET /quizes

exports.index = function(req, res, next) {
	models.Quiz.findAll({
		where: ["question like ?", '%'+req.query.search+'%']
	  }
	).then(function(quizes){
		res.render('quizes/index.ejs', {quizes: quizes});
	}).catch(function(error){
		next(error);
	});
};

// GET /quizes/question

exports.show = function(req, res, next) {
  models.Quiz.findById(req.params.quizId).then(function(quiz){
	if(quiz){
  	  var answer = req.query.answer || "";
  	  res.render('quizes/show', {quiz: req.quiz, answer: answer});
	}else{
	  throw new Error("No hay preguntas en las BBDD");}
	}).catch(function(error){
		next (error);
	});
};

// GET /quizes/check

exports.check = function(req, res) {
  models.Quiz.findById(req.params.quizId).then(function(quiz){
	if(quiz){
  	  var answer = req.query.answer || "";
  	  var result = answer === req.quiz.answer ? 'Correcta' : 'Incorrecta';
	  res.render('quizes/result', {quiz: req.quiz, result: result, answer: answer});
	}else{
	  throw new Error("No hay preguntas en las BBDD");}
	}).catch(function(error){
		next (error);
	});
};
 

