sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(MessageToast, MessageBox) {
  "use strict";

  return {
    showSuccess: function(sMessage) {
      MessageToast.show(sMessage);
    },

    showError: function(sMessage) {
      MessageBox.error(sMessage);
    },

    showInfo: function(sMessage) {
      MessageToast.show(sMessage);
    },

    showWarning: function(sMessage) {
      MessageBox.warning(sMessage);
    }
  };
});
