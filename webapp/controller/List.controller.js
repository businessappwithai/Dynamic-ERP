sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function(Controller, JSONModel, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.List", {

    onInit: function() {
      var oViewModel = new JSONModel({
        entityName: "",
        entityDisplayName: "",
        entityPath: "",
        itemCount: 0
      });
      this.getView().setModel(oViewModel, "view");
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("main");
    },

    onCreatePress: function() {
      var oViewModel = this.getView().getModel("view");
      var sEntityName = oViewModel.getProperty("/entityName");
      this.getOwnerComponent().getRouter().navTo(sEntityName + "CreateRoute");
    },

    onSearch: function(oEvent) {
      var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
      var oTable = this.byId("entityTable");
      var oBinding = oTable.getBinding("items");
      if (!oBinding) { return; }
      if (sQuery) {
        oBinding.filter([new Filter("id", FilterOperator.Contains, sQuery)]);
      } else {
        oBinding.filter([]);
      }
    },

    onItemPress: function(oEvent) {
      var oItem = oEvent.getSource();
      var oCtx = oItem.getBindingContext();
      if (oCtx) {
        var sId = oCtx.getProperty("id");
        var oViewModel = this.getView().getModel("view");
        var sEntityName = oViewModel.getProperty("/entityName");
        this.getOwnerComponent().getRouter().navTo(sEntityName + "DetailRoute", { id: sId });
      }
    },

    onRefresh: function() {
      var oTable = this.byId("entityTable");
      var oBinding = oTable && oTable.getBinding("items");
      if (oBinding) { oBinding.refresh(); }
    },

    onFilterPress: function() {},
    onSortPress: function() {},

    onDataReceived: function(oEvent) {
      var iCount = oEvent.getParameter("data") && oEvent.getParameter("data").results
        ? oEvent.getParameter("data").results.length : 0;
      this.getView().getModel("view").setProperty("/itemCount", iCount);
    }

  });
});
