
/* ============================================================================
   Title screen navigation.

   Everything above is the original "Tokyo Brain Pop - Home" component exactly
   as designed; only its class declaration was renamed so it can be extended.
   This overrides one method — activate() — to send the three menu items
   somewhere. The flash, the status line and every pixel of the screen are the
   original's, untouched.
   ========================================================================= */
class Component extends TBPHomeBase {
  activate(i) {
    super.activate(i);            // keep the original flash + status line
    setTimeout(function () {
      var H = window.TBPHome;
      if (!H) return;             // network layer still loading
      if (i === 0) H.createRoom();
      else if (i === 1) H.joinRoom();
      else H.headmaster();
    }, 90);
  }
}
