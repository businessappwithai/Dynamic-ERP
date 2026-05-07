/**
 * BusDiagnosis Detail Controller - Object Page (Column 3)
 *
 * Dedicated detail controller for Bus Diagnosis entity.
 * Displays all fields from sys_field ordered by seq_no.
 * Supports Edit/Delete functionality with ETag concurrency.
 *
 * Generated: 2026-03-09T11:47:10.456Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/format/DateFormat"
], function(Controller, JSONModel, Filter, FilterOperator, Sorter, MessageToast, MessageBox, DateFormat) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusDiagnosisDetail", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: true,
        editable: false,
        entityName: "bus_diagnosis",
        entityDisplayName: "Bus Diagnosis",
        entitySetName: "DiagnosisSet",
        fields: [],
        currentId: null
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busDiagnosisDetailRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      var sId = oEvent.getParameter("arguments").id;
      this.getView().getModel("view").setProperty("/currentId", sId);
      this._loadRecord(sId);
    },

    _loadRecord: function(sId) {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      oViewModel.setProperty("/busy", true);
      oViewModel.setProperty("/editable", false);

      var oModel = this.getOwnerComponent().getModel();
      var sPath = "/" + sEntitySet + "('" + sId + "')";

      oView.bindElement({
        path: sPath,
        events: {
          dataReceived: function() {
            oViewModel.setProperty("/busy", false);
          },
          change: function() {
            oViewModel.setProperty("/busy", false);
          }
        }
      });

      // Load field metadata
      this._loadFieldMetadata().then(function(aFields) {
        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/busy", false);
      }.bind(this)).catch(function() {
        oViewModel.setProperty("/busy", false);
      });
    },

    _loadFieldMetadata: function() {
      return new Promise(function(resolve, reject) {
        var oModel = this.getOwnerComponent().getModel();
        var aFilters = [
          new Filter("table_name", FilterOperator.EQ, "bus_diagnosis"),
          new Filter("is_displayed", FilterOperator.EQ, true),
          new Filter("is_active", FilterOperator.EQ, true)
        ];

        oModel.bindList("/SysFields", null, [new Sorter("seq_no")], aFilters)
          .requestContexts(0, 100)
          .then(function(aContexts) {
            resolve(aContexts.map(function(oCtx) { return oCtx.getObject(); }));
          })
          .catch(function() {
            resolve(this._getDefaultFields());
          }.bind(this));
      }.bind(this));
    },

    _getDefaultFields: function() {
      return [
        {
          column_name: "id",
          display_name: "Id",
          data_type: "string",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: false,
          seq_no: 0
        },
        {
          column_name: "patient_id",
          display_name: "Patient Id",
          data_type: "string",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 10
        },
        {
          column_name: "encounter_id",
          display_name: "Encounter Id",
          data_type: "string",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 20
        },
        {
          column_name: "diagnosis_date",
          display_name: "Diagnosis Date",
          data_type: "date",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 30
        },
        {
          column_name: "diagnosis_code",
          display_name: "Diagnosis Code",
          data_type: "string",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 40
        },
        {
          column_name: "diagnosis_type",
          display_name: "Diagnosis Type",
          data_type: "string",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 50
        },
        {
          column_name: "status",
          display_name: "Status",
          data_type: "string",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 60
        },
        {
          column_name: "notes",
          display_name: "Notes",
          data_type: "text",
          is_displayed: true,
          is_read_only: false,
          is_mandatory: true,
          seq_no: 70
        },
      ];
    },

    onEditPress: function() {
      this.getView().getModel("view").setProperty("/editable", true);
    },

    onSavePress: function() {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel();

      oModel.submitBatch("updateGroup").then(function() {
        oView.getModel("view").setProperty("/editable", false);
        MessageToast.show("Bus Diagnosis saved successfully");
      }).catch(function(oError) {
        MessageBox.error("Failed to save: " + (oError.message || "Unknown error"));
      });
    },

    onCancelPress: function() {
      var oModel = this.getOwnerComponent().getModel();
      oModel.resetChanges();
      this.getView().getModel("view").setProperty("/editable", false);
    },

    onDeletePress: function() {
      var that = this;
      MessageBox.confirm("Are you sure you want to delete this Bus Diagnosis?", {
        title: "Confirm Delete",
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.OK) {
            that._deleteRecord();
          }
        }
      });
    },

    _deleteRecord: function() {
      var oView = this.getView();
      var oContext = oView.getBindingContext();

      if (oContext) {
        oContext.delete().then(function() {
          MessageToast.show("Bus Diagnosis deleted successfully");
          this.onNavBack();
        }.bind(this)).catch(function(oError) {
          MessageBox.error("Failed to delete: " + (oError.message || "Unknown error"));
        });
      }
    },

    onNavBack: function() {
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busDiagnosisListRoute"); };
    },

    formatDate: function(oDate) {
      if (!oDate) return "";
      var oDateFormat = DateFormat.getDateTimeInstance({ style: "medium" });
      return oDateFormat.format(new Date(oDate));
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
