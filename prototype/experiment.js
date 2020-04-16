$(document).ready(function() {
  console.log('yo');
  $('#added').hide();
  $('#go-to-waiting-room').click( () => 
    {
      console.log('yo');
      $('#main').html("<p>FUCK YO COUCH</p><p>And then modify this to simulate opinions-only.</p>");
      $('#added').show();
    }
  )
});
