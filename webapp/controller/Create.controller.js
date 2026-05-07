sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.Create", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityDisplayName: "",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");
    },

    onSavePress: function() {
      var oViewModel = this.getView().getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      if (!sEntitySet) {
        MessageBox.error("Entity set not configured");
        return;
      }

      oViewModel.setProperty("/busy", true);
      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/" + sEntitySet);

      oListBinding.create(oFormData).created().then(function() {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Created successfully");
        this.onCancelPress();
      }.bind(this)).catch(function(oError) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to create: " + (oError.message || "Unknown error"));
      });
    },

    onCancelPress: function() {
      window.history.go(-1);
    },

    onClosePress: function() {
      var oAppView = this.getOwnerComponent().getModel("appView");
      if (oAppView) {
        oAppView.setProperty("/layout", "TwoColumnsMidExpanded");
      }
    }

  });
});
