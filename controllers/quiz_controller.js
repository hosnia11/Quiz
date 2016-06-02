
var models = require('../models');
var Sequelize = require('sequelize');
var cloudinary = require('cloudinary');
var fs = require('fs');


// Opciones para imagenes subidas a Cloudinary
var cloudinary_image_options = { crop: 'limit', width: 200, height: 200, radius: 5, border: "3px_solid_blue", tags: ['core', 'quiz-2016'] };

//load

exports.load = function(req, res, next, quizId) {
	models.Quiz.findById(quizId, {include: [ models.Comment, models.Attachment ]}).then(function(quiz){
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

// MW que permite acciones solamente si al usuario logeado es admin o es el autor del quiz.
exports.ownershipRequired = function(req, res, next){

    var isAdmin  = req.session.user.isAdmin;
    var quizAuthorId = req.quiz.AuthorId;
    var loggedUserId = req.session.user.id;

    if (isAdmin || quizAuthorId === loggedUserId) {
        next();
    } else {
      console.log('Operación prohibida: El usuario logeado no es el autor del quiz, ni un administrador.');
      res.send(403);
    }
};


// GET /quizes

exports.index = function(req, res, next) {
   if((req.params.format === "JSON" || req.params.format === "json")){
	models.Quiz.findAll({order: 'question ASC',
		where: ["question like ?", '%'+req.query.search+'%'],
		include: [ models.Attachment ]
	  }).then(function(quizes){
		res.json('quizes/index.ejs', {quizes: quizes});
	}).catch(function(error){
		next(error);
	});
   }else{
	models.Quiz.findAll({order: 'question ASC',
		where: ["question like ?", '%'+req.query.search+'%'],
		include: [ models.Attachment ]
	  }
	).then(function(quizes){
		res.render('quizes/index.ejs', {quizes: quizes});
	}).catch(function(error){
		next(error);
	});
   }
	
};

// GET /quizes/question

exports.show = function(req, res, next) {
  models.Quiz.findById(req.params.quizId).then(function(quiz){
	if(quiz){
	   if((req.params.format === "JSON" || req.params.format === "json")){
  	      var answer = req.query.answer || "";
  	      res.json('quizes/show', {quiz: req.quiz, answer: answer});
	   }else{
  	      var answer = req.query.answer || "";
  	      res.render('quizes/show', {quiz: req.quiz, answer: answer});
	   }
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
 
// GET /quizes/new

exports.new = function(req, res, next) {
	var quiz = models.Quiz.build({question: "", answer: ""});
	res.render('quizes/new', {quiz: quiz});
};

// GET /quizes/edit

exports.edit = function(req, res, next){
	var quiz = req.quiz;
	res.render('quizes/edit', {quiz: quiz});
};

// GET /quizes/update

exports.update = function(req, res, next){
	req.quiz.question = req.body.quiz.question;
	req.quiz.answer = req.body.quiz.answer;

	req.quiz.save({fields: ["question", "answer"]}).then(function(quiz){
		req.flash('success', 'Quiz editado con éxito');
			res.redirect('/quizes');
	}).catch(Sequelize.ValidationError, function(error){
	req.flash('error', 'Errores en el formulario:');
	for(var i in error.errors){
		req.flash('error', error.errors[i].value);
	};
	res.render('quizes/edit', {quiz: req.quiz});
	}).catch(function(error){
	req.flash('error', 'Error al editar el Quiz: '+error.message); 
	next(error);
	});
};

// GET /quizes/destroy

exports.destroy = function(req, res, next) {

// Borrar la imagen de Cloudinary (Ignoro resultado)
    if (req.quiz.Attachment) {
        cloudinary.api.delete_resources(req.quiz.Attachment.public_id);
    }

	req.quiz.destroy().then(function(){
		req.flash('success', 'Quiz borrado con éxito');
		res.redirect('/quizes');
	}).catch(function(error){
	req.flash('error', 'Error al borrar el Quiz: '+error.message); 
	next(error);
	});
};


// POST /quizzes/create
exports.create = function(req, res, next) {

    var authorId = req.session.user && req.session.user.id || 0;
    var quiz = { question: req.body.question, 
                 answer:   req.body.answer,
                 AuthorId: authorId };

    // Guarda en la tabla Quizzes el nuevo quiz.
    models.Quiz.create(quiz).then(function(quiz) {
        req.flash('success', 'Pregunta y Respuesta guardadas con éxito.');

        if (!req.file) { 
            req.flash('info', 'Es un Quiz sin imagen.');
            return; 
        }    

        // Salvar la imagen en Cloudinary
        return uploadResourceToCloudinary(req.file.path).then(function(uploadResult) {
            // Crear y guardar el nuevo attachment en la BBDD.
            if (uploadResult) {
                return models.Attachment.create({ public_id: uploadResult.public_id,
                                                  url: uploadResult.url,
                                                  filename: req.file.originalname,
                                                  mime: req.file.mimetype,
                                                  QuizId: quiz.id }).then(function(attachment) {
                    req.flash('success', 'Imagen nueva guardada con éxito.');
                }).catch(function(error) { // Ignoro errores de validacion en imagenes
                    req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
                    cloudinary.api.delete_resources(uploadResult.public_id);
                });
            }
        });
    }).then(function() {
        res.redirect('/quizzes');
    }).catch(Sequelize.ValidationError, function(error) {
        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        };
  
        res.render('quizzes/new', {quiz: quiz});
    }).catch(function(error) {
        req.flash('error', 'Error al crear un Quiz: '+error.message);
        next(error);
    }); 
};

