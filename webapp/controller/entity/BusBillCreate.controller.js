/**
 * BusBill Create Controller
 *
 * Handles creation of new Bus Bill records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.460Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusBillCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_bill",
        entityDisplayName: "Bus Bill",
        entitySetName: "BillSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busBillCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        bill_date: "",
        due_date: "",
        total_amount: 0,
        paid_amount: 0,
        status: "",
        payment_method: "",
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.bill_date && oFormData.bill_date !== 0 && oFormData.bill_date !== false) {
        MessageBox.error("Bill Date is required");
        return;
      }
      if (!oFormData.due_date && oFormData.due_date !== 0 && oFormData.due_date !== false) {
        MessageBox.error("Due Date is required");
        return;
      }
      if (!oFormData.total_amount && oFormData.total_amount !== 0 && oFormData.total_amount !== false) {
        MessageBox.error("Total Amount is required");
        return;
      }
      if (!oFormData.paid_amount && oFormData.paid_amount !== 0 && oFormData.paid_amount !== false) {
        MessageBox.error("Paid Amount is required");
        return;
      }
      if (!oFormData.status && oFormData.status !== 0 && oFormData.status !== false) {
        MessageBox.error("Status is required");
        return;
      }
      if (!oFormData.payment_method && oFormData.payment_method !== 0 && oFormData.payment_method !== false) {
        MessageBox.error("Payment Method is required");
        return;
      }
      if (!oFormData.notes && oFormData.notes !== 0 && oFormData.notes !== false) {
        MessageBox.error("Notes is required");
        return;
      }

      oViewModel.setProperty("/busy", true);

      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/" + sEntitySet);
      var oContext = oListBinding.create(oFormData);

      oContext.created().then(function() {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Bus Bill created successfully");
        this.onNavBack();
      }.bind(this)).catch(function(oError) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to create: " + (oError.message || "Unknown error"));
      });
    },

    onCancelPress: function() {
      this.onNavBack();
    },

    onNavBack: function() {
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busBillListRoute"); };
    },
    _getRouter: function() {
      var oComponent = this.getOwnerComponent();
      if (!oComponent) {
        console.error("Owner component not available in " + this.getMetadata().getName());
        MessageToast.show("Navigation not available");
        return null;
      }
      return oComponent.getRouter();
    },
  });
});
