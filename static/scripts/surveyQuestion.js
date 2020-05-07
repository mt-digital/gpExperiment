/* globals $, Survey, dallinger, util */

var NUM_PARTS_EXCEEDED_MESSAGE = '<p>The experiment has exceeded the maximum number of participants, your participation is not required. Click the button below to complete the HIT. You will be compensated as if you had completed the task.</p><button type="button" class="button btn-success">Complete</button>';

$(document).ready(function() {

  var question;
  dallinger.getExperimentProperty("question").done((r) => {

    question = r.question;
    $('#question').html(question);
    var survey = setupSurvey(question);

    $('.sv_complete_btn').css({
      "display": "block", 
      "margin": "0 auto", 
      "width": "50%", 
      "color": "gainsboro",
      "border": "none",
    });

    // $("#submit-answer").click(() => {
    survey.onComplete.add((result) => {
      
      // Post to question route, creating a question response for this
      // participant.
      // var answerValue = $("input[name='surveyQuestion']:checked").val(); 
      var answerValue = result.data.surveyQuestion.value;
      
      var urlParams = new URLSearchParams(window.location.search);

      var questionNumber = urlParams.get("number");
      // 'pre' or 'post', as in position relative to the opinion exchange step.
      var questionPosition = urlParams.get("position");

      console.log(questionNumber)
      console.log(questionPosition)
        

      survey
          .onComplete
          .add(function (result) {
              document
                  .querySelector('#surveyResult')
                  .textContent = "Result JSON:\n" + JSON.stringify(result.data, null, 3);
          });

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
            // currently forced to be "discussion" but TODO we will soon
            // be checking the config to see if this is a discussion condition,
            // opinion exchange condition, or structured arguments condtiion,
            // and route appropriately.
            dallinger.post("/question/" + dallinger.identity.participantId, 
              {
                question: question + "-" + questionPosition,
                number: questionNumber,
                response: answerValue
              }
            ).done(() => util.goToPage('discussion'));
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
  }); // Close of the done() callback for experiment config, which was 
      // necessary to have for all steps, so had to be in the callback.
});


/**
 * Given the question asked for this trial, set up the questionnaire.
 *
 * Adapted from surveyjs.io example: 
 * https://surveyjs.io/Examples/Library?id=bootstrap-material-theme&platform=jQuery&theme=modern#content-js
 *
 */
var setupSurvey = function(question) {
// var setupSurvey = function() {
  // Initialize Bootstrap Material theme, used by SurveyJS example I
  // liked and adapted.
  $.material.init();

  Survey.defaultBootstrapMaterialCss.navigationButton = "btn btn-green";
  Survey.defaultBootstrapMaterialCss.rating.item = "btn btn-default my-rating";
  Survey.StylesManager.applyTheme("bootstrapmaterial");

  var surveyInfo = {
      pages: [
          {
              questions: [
                  {
                      type: "matrix",
                      name: "surveyQuestion",
                      title: "Please indicate if you agree or disagree with the following statement<br/>" + question,
                      columns: [
                          {
                              value: -3,
                              text: "Strongly Disagree"
                          }, {
                              value: -2,
                              // text: ""
                              text: "Disagree"
                          }, {
                              value: -1,
                              // text: ""
                              text: "Somewhat disagree"
                          }, {
                              value: 0,
                              text: "Neutral"
                          }, {
                              value: 1,
                              // text: ""
                              text: "Somewhat agree"
                          }, {
                              value: 2,
                              // text: ""
                              text: "Agree"
                          }, {
                              value: 3,
                              text: "Strongly agree"
                          },
                      ],
                      rows: [
                          {
                              value: "value",
                              // text: question
                              text: " "
                          }
              ]}]}]};

  var survey = new Survey.Model(surveyInfo);

  $("#surveyElement").Survey({model: survey});

  return survey;
};
