$(document).ready(function() {

  $("#submit-answer").click(() => 
    {
      // Post to question route, creating a question response for this
      // participant.
    }
  );

  var potential_questions = [
    "How many legs does a spider have?",
    "How many drops of water in the ocean?"
  ];

  $("#question").html(potential_questions[0]);
});
