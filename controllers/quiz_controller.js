
// GET /quizes/question

exports.question = function(req, res, next) {
  var respuesta = req.query.respuesta || "";
  res.render('quizes/question', {pregunta: '¿Cual es la capital de Italia?', respuesta: respuesta});
};

// GET /quizes/answer

exports.answer = function(req, res, next) {
  var respuesta = req.query.respuesta || "";
  var result = ((respuesta === 'Roma') ? 'Correcta' : 'Incorrecta');
  res.render('quizes/answer', {result: result, respuesta: respuesta});
}; 

