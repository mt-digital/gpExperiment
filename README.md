# Extension of the Dallinger "networked chatroom" demo for group polarization experiments

The basic networked chatroom example provided by Dallinger
is a networked chatroom where players broadcast messages to each other.
I want to extend this to implement a group polarization experiment, where 
individuals respond to a survey question, such as whether the government should
increase or decrease defense spending. Participants will give their opinion on
either a continuous scale implemented as a slider in the browser, or on a
Likert-style scale with ordered categorical values (e.g. -3 greatly decrease to
+3 greatly increase defense spending). I am using this repository as a history
of steps I took to get this working as a prototype, which I hope to turn into a
tutorial and more documentation on Dallinger. It strikes me that this could 
turn into a course I teach some day.

Note that this demo has an additional dependency on the ``nltk`` library.  
You will need to run: ``pip install -r requirements.txt`` from the experiment directory before running the demo.


## How the chatroom experiment works

I think understanding how Dallinger works in the basic case of this chat room
will be helpful, so I want to take time here first for that. Dallinger provides
a front-end javascript library (`dallinger2.js`) that has helper functions for
making API calls to the experiment server. For now, let's focus on the helper
functions that send data from participants to the server, and how the server
coordinates conversation among participants. 

There are two data types we will use that represent experiment data. The first is
the `Question` data type. In the chatroom demo, the only question used is
the enagement questionnaire at the end of the experiment, so I will break that
down in order to build our own question page and make the necessary API calls.
The other data type is the `Info` data type. Messages written in the chatroom
are sent to the backend server as Info objects, and stored to a different table
than Questions in the Dallinger database.


### Recording question responses

To begin, let's analyze the survey questionnaire implementation. First, how
do participants get to the questionnaire page? In the chat page they click
``Leave chatroom,'' which ends this experiment. This button click is listened
for in `experiment.js` and handled by the following code

```js
$(document).ready( function() {
...

    $("#leave-chat").click(function() {
        leave_chatroom();
    });

...
});

var leave_chatroom = function() {
  dallinger.goToPage("questionnaire");
};
```

`dallinger.goToPage` redirects the participant to the page with the given 
name, for which you should have a template in the `templates` folder. One thing
I tried that worked was to change `"questionnaire"` to `"test"`, and created
the following file, `templates/test.html`:

```html
{% extends "basic/layout.html" %}

{% block body %}
    <h1>Hello, world!</h1>
    <h2>This is a test...</h2>
{% endblock %}
```

Then after one clicks "Leave chatroom", they see the above `test.html` rendered
instead of the questionnaire that comes with the demo. So, at the UI level, we
want to create a page that has a question like the questionnaire, but is a
separate, custom page like `test.html`.

Next, how do we send the participant's response to the server to be stored in
the database? The `questionnaire.html` template loads the
[base/questionnaire.html template](https://github.com/Dallinger/Dallinger/blob/master/dallinger/frontend/templates/base/questionnaire.html),
which has a button with id `#submit-questionnaire`. The listener for this
button press is actually in the template itself in the `scripts` Jinja
template block. Apparently the Dallinger javascript library provides a method
for submitting this exact questionnaire as this javascript code suggests 
in a script block at the bottom of `base/questionnaire.html`

```js
$(document).ready(function () {
  $("#submit-questionnaire").click(function() {
    dallinger.submitQuestionnaire();
  });
});
```

From the fact that `dallinger.submitQuestionnaire` is under the heading 
"Experiment Initialization and Completion" in the docs, and since 
the code calls `dallinger.submitAssignment`, which appears to end the
experiment, I don't think `submitQuestionnaire` can be used generally, it
has been designed only for the final question of the experiment.
However, I think we can learn from the implementation of submit questionnaire.
The [post request that sends question data](https://github.com/Dallinger/Dallinger/blob/9fbe19dc402eb46924c853a287730ae3935e5225/dallinger/frontend/static/scripts/dallinger2.js#L553)
could be easily adapted for our questions. Here are the most important parts:

```js
var inputs = $("form :input");
    var spinner = dlgr.BusyForm();
    var formDict = {};

    // Iterate through form inputs--we won't have to do this, we only have one.
    $.each(inputs, function(key, input) {
      if (input.name !== "") {
        formDict[input.name] = $(input).val();
      }
    });

    // Post data to backend server at question route. I don't know why
    // number is 1. `number` is a column of the database.
    xhr = dlgr.post('/question/' + dlgr.identity.participantId, {
      question: name || "questionnaire",
      number: 1,
      response: JSON.stringify(formDict)
    });
```
Not sure what the `BusyForm` function is, but it appears from `dallinger2.js`
that it just displays a spinner while data is sent to the server and the
participant is directed to the final screen a participant will see to 
close the experiment. I believe the HIT number is displayed for the 
participant's records.

To close out the discussion of recording participant answers to questions, 
how do we see participant responses in the database? First, log in to the
database in your terminal as user `dallinger`:

```sh
psql -U dallinger
```

then run the following query to view the first ten rows of the questions table

```sql
SELECT * FROM question LIMIT 10;
```


### Recording chat room statements

Now we turn to understand how the chatroom demo records statements as the
chat progresses. Every statement is sent and recorded as an 
[Info](http://docs.dallinger.io/en/latest/classes.html#info) object.
Message sending occurs via the `send_message` function in `experiment.js` that
is triggered when the `#send-message` button is clicked:

```js
var send_message = function() {

  $("#send-message").addClass("disabled");
  $("#send-message").html("Sending...");

  response = $("#reproduction").val();
  $("#reproduction").val("");

  var myId = dallinger.identity.participantId;

  $("#story").append("<p style='color: #1693A5;'>" + "Me: " + response + "</p>");
  $("#reproduction").focus();

  // Create a new Info object based on latest statement and POST it to server.
  dallinger.createInfo(my_node_id, {
    contents: response,
    info_type: "Info"
  }).done(function (resp) {
    console.log("sent!");
    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");
  });
};
```


### Next steps

1. I need to get a custom question page to work. I feel confident that
creating a new template and javascript file specifically for loading 
discussion questions and posting responses will be helpful. 
1. Limit the amount of time discussion lasts. Make it set in the config file 
and loaded on construction of experiment.py. Print the countdown timer, let's
say it's 10 seconds to start. 
1. Add a post-discussion custom question. Then participants asked again 
their post-question opinion.

First, we want to get a custom question page working. I'm calling it
`templates/survey_quesiton.html`. Its associated script is
`static/scripts/survey_question.html`.
