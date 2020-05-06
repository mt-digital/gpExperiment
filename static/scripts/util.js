/* globals dallinger */

/* exported util */

/**
 * Utilities for other .js in this repo.
 */

/**
 * Modification of the handy dallinger version that does not allow for a
 * page with search query appended. This version does, pass it the name of
 * the page with a query string.
 */
var util = (function () {

  var _util = {};

  _util.goToPage = function(pageWithQuery) {

    var url;
    if (pageWithQuery.includes("?")) {

      url = "/" + pageWithQuery + 
        "&participant_id=" + dallinger.identity.participantId;

    } else {

      url = "/" + pageWithQuery + 
        "?participant_id=" + dallinger.identity.participantId;

    }

    window.location = url;

  };

  return _util;
}());
