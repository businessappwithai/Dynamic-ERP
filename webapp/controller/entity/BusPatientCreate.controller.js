/**
 * BusPatient Create Controller
 *
 * Handles creation of new Bus Patient records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.442Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusPatientCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_patient",
        entityDisplayName: "Bus Patient",
        entitySetName: "PatientSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busPatientCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        uhid: "",
        mrn: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "",
        blood_group: "",
        marital_status: "",
        nationality: "",
        passport_number: "",
        email: "",
        phone: "",
        mobile: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relation: "",
        photo_url: "",
        biometric_data: "",
        is_vip: false,
        is_active: false,
        registered_at: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Validate only required fields based on database constraints
      if (!oFormData.first_name || oFormData.first_name.trim() === "") {
        MessageBox.error("First Name is required");
        return;
      }
      if (!oFormData.last_name || oFormData.last_name.trim() === "") {
        MessageBox.error("Last Name is required");
        return;
      }
      if (!oFormData.date_of_birth || oFormData.date_of_birth.trim() === "") {
        MessageBox.error("Date Of Birth is required");
        return;
      }
      if (!oFormData.gender || oFormData.gender.trim() === "") {
        MessageBox.error("Gender is required");
        return;
      }
      if (!oFormData.phone || oFormData.phone.trim() === "") {
        MessageBox.error("Phone is required");
        return;
      }

      // Set default values for boolean fields if not provided
      if (typeof oFormData.is_vip !== 'boolean') {
        oFormData.is_vip = false;
      }
      if (typeof oFormData.is_active !== 'boolean') {
        oFormData.is_active = true;
      }

      // Remove auto-generated fields - backend will handle them
      delete oFormData.uhid;
      delete oFormData.mrn;
      delete oFormData.registered_at;

      oViewModel.setProperty("/busy", true);

      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/" + sEntitySet);
      var oContext = oListBinding.create(oFormData);

      oContext.created().then(function() {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Bus Patient created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busPatientListRoute"); };
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
