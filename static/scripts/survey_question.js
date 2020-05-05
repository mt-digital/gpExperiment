/*globals $, dallinger */

var NUM_PARTS_EXCEEDED_MESSAGE = '<p>The experiment has exceeded the maximum number of participants, your participation is not required. Click the button below to complete the HIT. You will be compensated as if you had completed the task.</p><button type="button" class="button btn-success">Complete</button>';

$(document).ready(function() {
  var potentialQuestions = [
    "How many legs does a spider have?",
    "How many drops of water in the ocean?"
  ];

  var question = potentialQuestions[0];

  // TODO here is where we would get the Info from server that contains the
  // question of interest. 
  $("#question").html(question);

  $("#submit-answer").click(() => {

    // Post to question route, creating a question response for this
    // participant.
    var answerValue = $("input[name='response']:checked").val(); 

    console.log(answerValue);
    
    var urlParams = new URLSearchParams(window.location.search);

    var questionNumber = urlParams.get("number");
    // 'pre' or 'post', as in position relative to the opinion exchange step.
    var questionPosition = urlParams.get("position");

    console.log(questionNumber)
    console.log(questionPosition)
      
    if (questionPosition === 'pre') {

      /* Before submitting pre-exchange question response, we must first
       * create a participant. 
       */ 

      // Creating participant requires a quorum. It will not complete until
      // the server receives createParticipant requests from all potential
      // participant's browsers.
      $("#progress-container").show();

      dallinger.createParticipant().done(() => {

        if (dallinger.skip_experiment) {

          dallinger.allowExit();

          $('.main_div').html(NUM_PARTS_EXCEEDED_MESSAGE);

          $('#not-needed-exit').click(dallinger.submitAssignment);

        } else {
         
          // Post response to question and proceed to opinion exchange, 
          // currently called by its to-be-replaced placeholder 'experiment'.
          dallinger.post("/question/" + dallinger.identity.participantId, 
            {
              question: question + "-" + questionPosition,
              number: questionNumber,
              response: answerValue
            }
          ).done(() => dallinger.goToPage('experiment'));
        }
      });

    } else {

      // If this is the post-exchange question, go to the questionnaire after
      // submitting response.
      dallinger.post("/question/" + dallinger.identity.participantId, 
        {
          question: question + "-" + questionPosition,
          number: questionNumber,
          response: answerValue
        }
      ).done(() => dallinger.goToPage('questionnaire'));
    }
  });

});
