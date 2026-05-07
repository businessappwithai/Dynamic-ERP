sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/f/FlexibleColumnLayoutSemanticHelper",
  "sap/f/library"
], function(Controller, JSONModel, FlexibleColumnLayoutSemanticHelper, fioriLibrary) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.App", {

    onInit: function() {
      var oModel = new JSONModel({
        layout: fioriLibrary.LayoutType.OneColumn
      });
      this.getView().setModel(oModel, "appView");

      this.getOwnerComponent().getRouter().initialize();
    },

    onStateChange: function(oEvent) {
      var oLayout = oEvent.getParameter("layout");
      this.getView().getModel("appView").setProperty("/layout", oLayout);
    }

  });
});
