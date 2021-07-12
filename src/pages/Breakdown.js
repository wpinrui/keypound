import React, { useEffect, useState } from "react";
import Navigation from "../components/Navigation";
import { Table } from "../components/Table";
import { Content } from "../components/ContentCard";
import "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { getDocs } from "../backendUtils";

function Breakdown() {
  const { currentUser } = useAuth();
  const [tableData, setTableData] = useState();

  useEffect(() => {
    document.title = "Breakdown - Keypound";
    getDocs(currentUser).then((doc) => {
      if (doc.exists) {
        setTableData(doc.data().monthArr);
      }
    });
  }, [currentUser]);

  return (
    <>
      <Navigation active="Breakdown" />

      {tableData && (
        <Content title="Breakdown">
          <h4 className="body-title">All Transactions</h4>
          <p className="content-text">Select an entry to edit or delete it.</p>
          <Table monthArr={tableData} />
        </Content>
      )}
    </>
  );
}

export default Breakdown;
