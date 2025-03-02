// useSalesData.js
const useSalesData = () => {
    const [salesData, setSalesData] = useState({
      labels: [],
      datasets: [
        {
          label: 'Vendas Mensais',
          data: [],
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    });
  
    useEffect(() => {
      const subscriptionsRef = ref(db, 'subscriptions');
      onValue(subscriptionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const labels = Object.keys(data);
          const amounts = labels.map((month) => data[month].amount);
  
          setSalesData({
            labels,
            datasets: [
              {
                ...salesData.datasets[0],
                data: amounts,
              },
            ],
          });
        }
      }, (error) => {
        console.error("Error fetching sales data:", error);
      });
    }, []);
  
    return salesData;
  };
  
  export default useSalesData;