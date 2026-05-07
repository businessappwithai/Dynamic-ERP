/**
 * BusInsuranceProvider Create Controller
 *
 * Handles creation of new Bus Insurance Provider records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.462Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusInsuranceProviderCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_insurance_provider",
        entityDisplayName: "Bus Insurance Provider",
        entitySetName: "InsuranceProviderSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busInsuranceProviderCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        name: "",
        code: "",
        contact_person: "",
        phone: "",
        email: "",
        address_line1: "",
        city: "",
        state: "",
        country: "",
        is_active: false,
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.name && oFormData.name !== 0 && oFormData.name !== false) {
        MessageBox.error("Name is required");
        return;
      }
      if (!oFormData.code && oFormData.code !== 0 && oFormData.code !== false) {
        MessageBox.error("Code is required");
        return;
      }
      if (!oFormData.contact_person && oFormData.contact_person !== 0 && oFormData.contact_person !== false) {
        MessageBox.error("Contact Person is required");
        return;
      }
      if (!oFormData.phone && oFormData.phone !== 0 && oFormData.phone !== false) {
        MessageBox.error("Phone is required");
        return;
      }
      if (!oFormData.email && oFormData.email !== 0 && oFormData.email !== false) {
        MessageBox.error("Email is required");
        return;
      }
      if (!oFormData.address_line1 && oFormData.address_line1 !== 0 && oFormData.address_line1 !== false) {
        MessageBox.error("Address Line1 is required");
        return;
      }
      if (!oFormData.city && oFormData.city !== 0 && oFormData.city !== false) {
        MessageBox.error("City is required");
        return;
      }
      if (!oFormData.state && oFormData.state !== 0 && oFormData.state !== false) {
        MessageBox.error("State is required");
        return;
      }
      if (!oFormData.country && oFormData.country !== 0 && oFormData.country !== false) {
        MessageBox.error("Country is required");
        return;
      }
      if (!oFormData.is_active && oFormData.is_active !== 0 && oFormData.is_active !== false) {
        MessageBox.error("Is Active is required");
        return;
      }

      oViewModel.setProperty("/busy", true);

      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/" + sEntitySet);
      var oContext = oListBinding.create(oFormData);

      oContext.created().then(function() {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Bus Insurance Provider created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busInsuranceProviderListRoute"); };
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
