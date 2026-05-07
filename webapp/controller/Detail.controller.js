sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/format/DateFormat"
], function(Controller, JSONModel, MessageToast, MessageBox, DateFormat) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.Detail", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        editMode: false,
        title: "",
        status: "",
        statusState: "None",
        showSystemFields: false,
        id: ""
      });
      this.getView().setModel(oViewModel, "view");
    },

    onEditPress: function() {
      this.getView().getModel("view").setProperty("/editMode", true);
    },

    onSavePress: function() {
      var oViewModel = this.getView().getModel("view");
      var oModel = this.getOwnerComponent().getModel();
      oViewModel.setProperty("/busy", true);
      oModel.submitBatch("update").then(function() {
        oViewModel.setProperty("/busy", false);
        oViewModel.setProperty("/editMode", false);
        MessageToast.show("Saved successfully");
      }).catch(function(oError) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to save: " + (oError.message || "Unknown error"));
      });
    },

    onCancelPress: function() {
      this.getOwnerComponent().getModel().resetChanges();
      this.getView().getModel("view").setProperty("/editMode", false);
    },

    onDeletePress: function() {
      var that = this;
      MessageBox.confirm("Are you sure you want to delete this record?", {
        title: "Confirm Delete",
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.OK) {
            var oContext = that.getView().getBindingContext();
            if (oContext) {
              oContext.delete("$auto").then(function() {
                MessageToast.show("Deleted successfully");
                that.onClosePress();
              }).catch(function(oError) {
                MessageBox.error("Failed to delete: " + (oError.message || "Unknown error"));
              });
            }
          }
        }
      });
    },

    onClosePress: function() {
      var oAppView = this.getOwnerComponent().getModel("appView");
      if (oAppView) {
        oAppView.setProperty("/layout", "TwoColumnsMidExpanded");
      }
    },

    formatDateTime: function(sValue) {
      if (!sValue) { return ""; }
      var oFormat = DateFormat.getDateTimeInstance({ style: "medium" });
      return oFormat.format(new Date(sValue));
    }

  });
});
