sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.Admin", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        hasChanges: false,
        tables: [],
        fields: [],
        visibleFields: [],
        selectedEntity: null,
        selectedEntityName: "",
        layoutMode: "form",
        stats: {
          tableCount: 0,
          columnCount: 0,
          fieldCount: 0,
          windowCount: 0
        }
      });
      this.getView().setModel(oViewModel, "view");
      this._loadTables();
    },

    _loadTables: function() {
      var oViewModel = this.getView().getModel("view");
      oViewModel.setProperty("/busy", true);
      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/SysTableSet");
      oListBinding.requestContexts(0, 100).then(function(aContexts) {
        var aTables = aContexts.map(function(oCtx) {
          return oCtx.getObject();
        });
        oViewModel.setProperty("/tables", aTables);
        oViewModel.setProperty("/stats/tableCount", aTables.length);
        oViewModel.setProperty("/busy", false);
      }).catch(function() {
        oViewModel.setProperty("/busy", false);
      });
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("main");
    },

    onRefreshPress: function() {
      this._loadTables();
    },

    onSavePress: function() {
      var oModel = this.getOwnerComponent().getModel();
      oModel.submitBatch("update").then(function() {
        this.getView().getModel("view").setProperty("/hasChanges", false);
        MessageToast.show("Changes saved successfully");
      }.bind(this)).catch(function(oError) {
        MessageBox.error("Failed to save: " + (oError.message || "Unknown error"));
      });
    },

    onTableSearch: function(oEvent) {
      var sQuery = oEvent.getParameter("newValue") || "";
      var oTable = this.byId("sysTableList");
      var oBinding = oTable.getBinding("items");
      var aFilters = [];
      if (sQuery) {
        aFilters.push(new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery));
      }
      oBinding.filter(aFilters);
    },

    onTableSelectionChange: function(oEvent) {
      var oItem = oEvent.getParameter("listItem");
      var oCtx = oItem.getBindingContext("view");
      if (!oCtx) { return; }
      var oTable = oCtx.getProperty("");
      var oViewModel = this.getView().getModel("view");
      oViewModel.setProperty("/selectedEntity", oTable);
      oViewModel.setProperty("/selectedEntityName", oTable.name || "");
      this._loadFields(oTable.table_name);
    },

    _loadFields: function(sTableName) {
      var oViewModel = this.getView().getModel("view");
      oViewModel.setProperty("/busy", true);
      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/SysFieldSet", undefined, undefined, [
        new sap.ui.model.Filter("table_name", sap.ui.model.FilterOperator.EQ, sTableName)
      ]);
      oListBinding.requestContexts(0, 200).then(function(aContexts) {
        var aFields = aContexts.map(function(oCtx) { return oCtx.getObject(); });
        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/visibleFields", aFields.filter(function(f) { return f.is_displayed; }));
        oViewModel.setProperty("/stats/fieldCount", aFields.length);
        oViewModel.setProperty("/busy", false);
      }).catch(function() {
        oViewModel.setProperty("/busy", false);
      });
    },

    onModeChange: function(oEvent) {
      var sKey = oEvent.getParameter("item").getKey();
      this.getView().getModel("view").setProperty("/layoutMode", sKey);
    },

    onFieldDrop: function(oEvent) {
      var oDraggedItem = oEvent.getParameter("draggedControl");
      var oDroppedItem = oEvent.getParameter("droppedControl");
      var sDropPosition = oEvent.getParameter("dropPosition");
      var oList = this.byId("fieldList");
      var oViewModel = this.getView().getModel("view");
      var aFields = oViewModel.getProperty("/fields");

      var iDragIdx = oList.indexOfItem(oDraggedItem);
      var iDropIdx = oList.indexOfItem(oDroppedItem);
      if (iDragIdx < 0 || iDropIdx < 0) { return; }

      var oMoved = aFields.splice(iDragIdx, 1)[0];
      var iInsert = sDropPosition === "After" ? iDropIdx : iDropIdx - 1;
      aFields.splice(Math.max(0, iInsert), 0, oMoved);

      aFields.forEach(function(f, i) { f.seq_no = i + 1; });
      oViewModel.setProperty("/fields", aFields);
      oViewModel.setProperty("/hasChanges", true);
    },

    onMoveFieldUp: function(oEvent) {
      this._moveField(oEvent, -1);
    },

    onMoveFieldDown: function(oEvent) {
      this._moveField(oEvent, 1);
    },

    _moveField: function(oEvent, iDirection) {
      var oItem = oEvent.getSource().getParent().getParent().getParent();
      var oList = this.byId("fieldList");
      var oViewModel = this.getView().getModel("view");
      var aFields = oViewModel.getProperty("/fields");
      var iIdx = oList.indexOfItem(oItem);
      var iNew = iIdx + iDirection;
      if (iNew < 0 || iNew >= aFields.length) { return; }
      var oTemp = aFields[iIdx];
      aFields[iIdx] = aFields[iNew];
      aFields[iNew] = oTemp;
      aFields.forEach(function(f, i) { f.seq_no = i + 1; });
      oViewModel.setProperty("/fields", aFields);
      oViewModel.setProperty("/hasChanges", true);
    },

    onSeqNoChange: function(oEvent) {
      this.getView().getModel("view").setProperty("/hasChanges", true);
    },

    onVisibilityChange: function(oEvent) {
      this.getView().getModel("view").setProperty("/hasChanges", true);
      var aFields = this.getView().getModel("view").getProperty("/fields");
      var aVisible = aFields.filter(function(f) { return f.is_displayed; });
      this.getView().getModel("view").setProperty("/visibleFields", aVisible);
    }

  });
});
