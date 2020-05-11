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
"Leave chatroom," which ends this experiment. This button click is listened
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
name, for which you should have a template in the `templates` folder. 

As a first step towards adapting the chatroom for group polarization, I
changed `"questionnaire"` to `"test"`, and created
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

### Send question data to server

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


## The adaptation

After some initial exploration of the chatroom structure, reviewed above,
I was able to insert a pre- and post-discussion "survey question" in the
experiment flow. I refactored `experiment.js`, and renamed it `discussion.js`.
In this way I began the process of modularization. There is now a
`surveyQuestion.js` in `static/scripts` and accompanying 
`templates/discussion.html` and `survey_question.html`, with
`templates/discussion.html` replacing `templates/experiment.html`.

There are a number of changes to get the desired workflow. One confusing point
of the basic chatroom demo is that navigation is split between HTML and
JavaScript. I don't know if I fixed this at all, or if it is even fixable, but
it did make adapting the workflow a bit confusing. 
Here I will demonstrate elements of how I am handling both pre- and post-discussion
question responses with a single JavaScript file, and how `config.txt` is read
to set experiment parameters, including the question participants are asked
and the discussion duration.

### Updated experiment flow

I think of changing the experiment flow as rewiring a flow chart. Originally
we had

```
Ad -> Consent -> Instructions -> Discussion -> Engagement Questionnaire -> Thanks & close
```

This is now

```
... -> Instructions -> Pre-discussion question -> Discussion -> Post-discussion question -> Engagement ...
```

So the first modification comes in `templates/instructions/instruct-ready.html`.
Here, the participant reads the instructions then clicks a button with
`onClick="window.location='/survey_question?number=1&position=pre'`. This 
has changed from the redirect going not to a `survey_question`, but to 
`experiment`. The URL redirect provides a clue about one component of this
workflow, separating pre-discussion from post-discussion. For design purposes
I have also included a question number in the URL query, but this is currently
unused as my current design is to have each participant only answer one 
question.

The template `templates/survey_question.html` is a total rewrite from the
questionnaire because I wanted radio buttons instead of a dropdown menu, as
the engagement survey has. Dropdowns have a default, and it's too easy to just
select some random value if there were no default. To implement this, I found
help from the [SurveyJS]() library, which helped me build the question with
radio buttons. I show below how the question is set in `config.txt` and read
in `surveyQuestion.js`. 

I used the URL query parameters to determine where the participant goes next
depending on whether this is pre-discussion or post-discussion. I will show
snippets to illustrate. Here is the code that reads the URL and directs
traffic. Note that in pre-discussion the participant does not proceed until
their waiting room is full of $N-1$ other participants; in the base chatroom,
the waiting room progress bar was part of the instructions page. The following
code is adapted from [the callback in survey.onComplete in `surveyQuestion.js`](https://github.com/mt-digital/gpExperiment/blob/master/static/scripts/surveyQuestion.js#L23).

```js
var questionPosition = urlParams.get("position");

if (questionPosition === 'pre') {
    // Show waiting room progress bar.
    $("#progress-container").show()
    // A participant must be created before they can respond to a question.
    dallinger.createParticipant().done(() => {
        // ... skipping code that checks for over-recruitment...
        // ... and setting of some variables below...
        // Post question and response to server, going to question table in DB.
        dallinger.post("/question/" + dallinger.identity.participantId,
            {
                question: question + "-" + questionPosition,
                number: questionNumber,
                response: answerValue
            }
    // Using customization of dallinger's goToPage to allow for the custom
    // URL query parameters I'm using for navigation.
    }).done(() => util.goToPage('discussion'));
}
```

Discussion ends for a participant when the discussion duration has 
elapsed (see below for how this is being set and used) or the user decides to
leave the discussion. This is handled by 
[`leaveChatroom` in discussion.js](https://github.com/mt-digital/gpExperiment/blob/master/static/scripts/discussion.js#L155),
which calls `util.goToPage("survey_question?number=1&position=post")` to 
navigate the participant to the post-discussion survey.

The post-discussion survey question submission is the following

```js
dallinger.post("/question/" + dallinger.identity.participantId, 
          {
            question: question + "-" + questionPosition,
            number: questionNumber,
            response: answerValue
          }
        ).done(() => util.goToPage('questionnaire'));
```


### Using config.txt parameters on frontend

I have set two config values in `config.txt`. This file is read by
`experiment.py`. The developer must specify which configuration variables 
`experiment.py` should read by editing that file. Here are relevant parts from
my config and experiment files.

`config.txt`
```
[Experiment]
mode = sandbox
auto_recruit = true
network = FullyConnected
repeats = 1
n = 2
question = The response of the United States federal government (the Trump administration) to the COVID-19 pandemic has been appropriate.
discussion_duration = 15
```

`experiment.py`
```python
def extra_parameters():
    config = get_config()
    config.register("network", unicode)
    config.register("question", unicode)  # <-- New
    config.register("repeats", int)
    config.register("n", int)
    config.register("discussion_duration", int)  # <-- New
```

This is enough to make these configuration parameters available on the server,
but not yet to the client. To do this, we need to add the following block to
the `configure` method of `CoordinationChatroom`

```python
self.public_properties.update(
            {
                'question': config.get('question'),
                'discussion_duration': config.get('discussion_duration')
            }
        )
```

In `surveyQuestion.js`, the question is read by calling 

```js
dallinger.getExperimentProperty("question").done((r) => {
    // ... This callback provides functions for handling participant response
    // we have seen in code blocks above. See code on GitHub for more...
});
```

Similarly, in `discussion.js` the discussion duration is set on document load:
```js
dallinger.getExperimentProperty("discussion_duration").done((r) => {
    DISCUSSION_DURATION = r.discussion_duration;
    $("#timer").html(
      "0 of " + DISCUSSION_DURATION + " seconds complete"
    );
  });
```


### Other changes not yet covered

It took some effort and hacking to get the discussion duration timer to work.
It's currently working by having `FIRST_COMM_TIME` be a global and checking
if it has been defined yet. If the participant sends a message or a group
member has sent a message, this time will be set. Every 100ms, along with 
checking for new messages from group members, the script checks if the
`elapsed` time is greater than the `DISCUSSION_DURATION`. If so, the 
participant is sent to `/survey_question?number=1&position=post`.

It took some hacking to get SurveyJS to look decent and to work well with my
system. Note there is an associated style sheet,
`static/css/surveyQuestion.css`.


## Conclusion

At this point I have mastered some of Dallinger's basics, namely how to 
send data between server and client, how to extend basic Dallinger templates,
and how to work with Dallinger's navigation system, which is tied to its
participant recruitment, tracking, and compensation system. Since I did not 
want to work out the components needed for Qualtrics-like radio button 
survey questions, I found SurveyJS, which does a decent job. In a future
iteration I may just yank out code from SurveyJS so I can customize it, or 
just use the few bits I need. SurveyJS is meant for people with long, 
multifaceted surveys, and not really people like me who need one question to
look good. I will also keep searching around for a better survey question 
template.

For my next work I will just continue fixing issues and opening new issues. I
have stubbed two additional experiment conditions with different group exchange
conditions. One is the structured argument condition, where participants give
one sentence at a time to support their position or address another
participant's previous arguments; the other is the opinion-only condition, where
participants are shown one another's opinions, but they do not discuss or
argue for their opinion. Another high priority item is to use a slider instead
of a Likert scale for survey response, another variation in the procedure we
will use. Then we will be close to deploying our first demo.
