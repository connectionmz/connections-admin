import React, { useEffect, useState } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

const FinancialReport = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      setError(null);
      const db = getDatabase();
      const subscriptionsRef = ref(db, "subscriptions");

      try {
        const snapshot = await get(subscriptionsRef);
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const formattedData = formatData(rawData);
          setSubscriptions(formattedData);
          setGroupedData(groupByCompany(formattedData));
        } else {
          console.log("No data available");
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError("Erro ao carregar os dados. Por favor, tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const formatData = (data) => {
    const results = [];
    Object.keys(data).forEach((userKey) => {
      const userSubscriptions = data[userKey];
      Object.keys(userSubscriptions).forEach((year) => {
        const months = userSubscriptions[year];
        Object.keys(months).forEach((month) => {
          const days = months[month];
          Object.keys(days).forEach((dayKey) => {
            results.push({
              id: dayKey,
              userName: days[dayKey].userName,
              amount: days[dayKey].amount,
              method: days[dayKey].method,
              moduleKey: days[dayKey].moduleKey,
              companyName: days[dayKey].companyName,
              paidAt: new Date(days[dayKey].paidAt).toLocaleString(),
              timestamp: new Date(days[dayKey].paidAt).getTime(),
            });
          });
        });
      });
    });
    return results;
  };

  const groupByCompany = (data) => {
    return data.reduce((acc, curr) => {
      const company = curr.companyName;
      if (!acc[company]) {
        acc[company] = [];
      }
      acc[company].push(curr);
      return acc;
    }, {});
  };

  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
  };

  const exportReceipt = (data, type = "module") => {
    const doc = new jsPDF();
    const companyName = data[0]?.companyName || "Empresa";
    doc.text(`Recibo de Pagamento - ${companyName}`, 14, 10);

    let totalAmount = 0;
    const tableRows = [];
    data.forEach((item) => {
      const amountWithTax = Number(item.amount) * 1.16;
      totalAmount += amountWithTax;
      tableRows.push([
        item.moduleKey,
        item.method,
        `${Number(item.amount).toFixed(2)} MT`,
        `${amountWithTax.toFixed(2)} MT (IVA)`
      ]);
    });

    doc.autoTable({
      head: [["Módulo", "Método", "Valor", "Total c/ IVA"]],
      body: tableRows,
      startY: 20,
    });

    doc.text(`Total Geral: ${totalAmount.toFixed(2)} MT`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(
      type === "module" ? `Recibo_Modulo_${companyName}.pdf` : `Recibo_Mensal_${companyName}.pdf`
    );
  };

  const calculateChartData = () => {
    const labels = Object.keys(groupedData);
    const data = labels.map(
      (company) => groupedData[company].reduce((sum, item) => sum + Number(item.amount), 0)
    );

    return {
      labels,
      datasets: [
        {
          label: "Total Pago por Empresa (MT)",
          data,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Extrato Financeiro</h2>

      {isLoading && <p className="text-blue-500">Carregando dados...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && (
        <>
      

          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Empresas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(groupedData).map((company) => (
                <button
                  key={company}
                  onClick={() => handleCompanyClick(company)}
                  className="p-4 bg-gray-200 rounded shadow hover:bg-gray-300"
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {selectedCompany && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Detalhes de {selectedCompany}</h3>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => exportReceipt(groupedData[selectedCompany], "module")}
                  className="p-2 bg-blue-500 text-white rounded"
                >
                  Emitir Recibo por Módulo
                </button>
                <button
                  onClick={() => exportReceipt(groupedData[selectedCompany], "month")}
                  className="p-2 bg-green-500 text-white rounded"
                >
                  Emitir Recibo Mensal
                </button>
              </div>
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Módulo</th>
                    <th className="border p-2">Método</th>
                    <th className="border p-2">Valor</th>
                    <th className="border p-2">Valor c/ IVA</th>
                    <th className="border p-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData[selectedCompany].map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.moduleKey}</td>
                      <td className="border p-2">{item.method}</td>
                      <td className="border p-2">{Number(item.amount).toFixed(2)} MT</td>
                      <td className="border p-2">
                        {(Number(item.amount) * 1.16).toFixed(2)} MT
                      </td>
                      <td className="border p-2">{item.paidAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialReport;
