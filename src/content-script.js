import * as u from './util.js';

/** Doc OnReady */

u.ready(function() {
  //console.debug('yesican ready');

  // Quora/Wired
  document.body.classList.remove('signup_wall_prevent_scroll');

  // Business Insider
  document.body.classList.remove('tp-modal-open');
//  document.body.classList.remove('logged_out');
//    $('[id$=_signup_wall_wrapper] *').remove();
//    $('.signup_wall_prevent_scroll').remove();

  /*
  var domInsertionObserver = new MutationObserver(function(mutation){
    console.log({'yesican dom mutation occurred': mutation});
  });

  domInsertionObserver.observe(document, { childList: true, subtree: true })
  */
});
