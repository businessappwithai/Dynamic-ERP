/**
 * BusEncounter Create Controller
 *
 * Handles creation of new Bus Encounter records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.447Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusEncounterCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_encounter",
        entityDisplayName: "Bus Encounter",
        entitySetName: "EncounterSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busEncounterCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        encounter_type: "",
        status: "",
        encounter_date: "",
        discharge_date: "",
        chief_complaint: "",
        vitals_recorded: false,
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.encounter_type && oFormData.encounter_type !== 0 && oFormData.encounter_type !== false) {
        MessageBox.error("Encounter Type is required");
        return;
      }
      if (!oFormData.status && oFormData.status !== 0 && oFormData.status !== false) {
        MessageBox.error("Status is required");
        return;
      }
      if (!oFormData.encounter_date && oFormData.encounter_date !== 0 && oFormData.encounter_date !== false) {
        MessageBox.error("Encounter Date is required");
        return;
      }
      if (!oFormData.discharge_date && oFormData.discharge_date !== 0 && oFormData.discharge_date !== false) {
        MessageBox.error("Discharge Date is required");
        return;
      }
      if (!oFormData.chief_complaint && oFormData.chief_complaint !== 0 && oFormData.chief_complaint !== false) {
        MessageBox.error("Chief Complaint is required");
        return;
      }
      if (!oFormData.vitals_recorded && oFormData.vitals_recorded !== 0 && oFormData.vitals_recorded !== false) {
        MessageBox.error("Vitals Recorded is required");
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
        MessageToast.show("Bus Encounter created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busEncounterListRoute"); };
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
