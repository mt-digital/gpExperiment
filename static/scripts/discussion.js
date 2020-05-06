/* globals $, dallinger, util */

/* exported createAgent */

var MY_NODE_ID;

/**
 * Get current transmissions for this agent and initiate an infinite recursive
 * loop that listens for new transmissions by checking the server every 100ms
 * for new transmissions.
 *
 * As other agents chat, this turns into Info submissions that are then
 * transmitted along Vectors to neighboring Agents. Here the script is
 * collecting all new transmissions from all other agents connected to this
 * agent. A transmission is "new" if it has been submitted to the server
 * since the last time this client requested its transmissions via this
 * getTransmissions call.
 */
var loadTransmissions = function(MY_NODE_ID) {

  // Fetch 'pending' transmissions that have not yet been requested.
  dallinger.getTransmissions(MY_NODE_ID, { status: 'pending' }).done(resp => {
    
    // Iterate over transmissions received, display each one.
    resp.transmissions.forEach(t => displayTransmission(t.info_id));

    // Repeat request-display loop every 100ms.
    setTimeout(() => loadTransmissions(MY_NODE_ID), 100);
  });

};


// Create the agent. Called once in discussion.html.
var createAgent = function() {

  dallinger.createAgent().done(resp => {

    $("#stimulus").show();

    $("#response-form").show();

    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");

    $("#reproduction").focus();

    MY_NODE_ID = resp.node.id;

    loadTransmissions(MY_NODE_ID);

  }).fail(function (rejection) {

    // A 403 is our signal that it's time to go to the questionnaire
    if (rejection.status === 403) {
      dallinger.allowExit();
      // dallinger.goToPage('questionnaire');
      // dallinger.goToPage('questionnaire');
      util.goToPage('questionnaire');
    } else {
      dallinger.error(rejection);
    }
  });
};



var displayTransmission = function(info_id) {
  dallinger.getInfo(MY_NODE_ID, info_id)
    .done(function (resp) {
      console.log(resp.info.contents);
      $("#story").append("<p>" + resp.info.origin_id + ': ' + resp.info.contents + "</p>");
    });
};


var sendMessage = function() {

  $("#send-message").addClass("disabled");
  $("#send-message").html("Sending...");

  var response = $("#reproduction").val();
  $("#reproduction").val("");

  $("#story").append("<p style='color: #1693A5;'>" + "Me: " + response + "</p>");
  $("#reproduction").focus();

  // Create a new Info object based on latest statement and POST it to server.
  dallinger.createInfo(MY_NODE_ID, {
    contents: response,
    info_type: "Info"
  }).done(function (resp) {
    console.log("sent!");
    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");
  });
};


var leaveChatroom = function() {
  // location.replace(
  //   "/survey_question?number=1&position=post&participant_id=" + 
  //     dallinger.identity.participantId
  // );
  util.goToPage("survey_question?number=1&position=post")
};


$(document).keypress(function (e) {
  if (e.which === 13) {
    console.log("enter!");
    $("#send-message").click();
    return false;
  }
});


$(document).ready(function() {
    
  // Proceed to the waiting room listener.
  $("#go-to-waiting-room").click(function() {
    util.goToPage("waiting");
  });

  // Message send listener.
  $("#send-message").click(function() {
    sendMessage();
  });

  // Leave room listener.
  $("#leave-chat").click(function() {
    leaveChatroom();
  });
});

