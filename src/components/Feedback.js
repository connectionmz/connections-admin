import { ref, onValue, update } from "firebase/database";
import { useEffect, useState } from "react";
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { db } from "../fb";
import { AdminCard, AdminPage, AdminPageHeader, LoadingState } from './admin/ui/AdminUI';

const FeedbackDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("unanswered");

  useEffect(() => {
    const feedbackRef = ref(db, "feedback");
    const companyRef = ref(db, "company");
    let unsubscribeFeedback = () => {};

    const unsubscribeCompanies = onValue(companyRef, (companySnapshot) => {
      const companyData = companySnapshot.val();
      if (companyData) {
        unsubscribeFeedback();
        unsubscribeFeedback = onValue(feedbackRef, (feedbackSnapshot) => {
          const feedbackData = feedbackSnapshot.val();
          if (feedbackData) {
            const allFeedbacks = [];
            Object.keys(feedbackData).forEach(userId => {
              Object.keys(feedbackData[userId]).forEach(feedbackId => {
                const companyInfo = companyData[userId] || null;
                allFeedbacks.push({
                  id: feedbackId,
                  userId: userId,
                  ...feedbackData[userId][feedbackId],
                  companyInfo: companyInfo ? {
                    ...companyInfo,
                    email: companyInfo.email || 'Email não disponível'
                  } : null,
                  answered: feedbackData[userId][feedbackId].answered || false
                });
              });
            });
            
            allFeedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setFeedbacks(allFeedbacks);
          }
          setLoading(false);
        });

      }
    });
    return () => {
      unsubscribeCompanies();
      unsubscribeFeedback();
    };
  }, []);

  const handleMarkAsAnswered = (feedbackId, userId) => {
    const updates = {};
    updates[`feedback/${userId}/${feedbackId}/answered`] = true;
    updates[`feedback/${userId}/${feedbackId}/answeredAt`] = new Date().toISOString();

    update(ref(db), updates)
      .then(() => console.log("Feedback marcado como respondido"))
      .catch((error) => console.error("Erro ao atualizar feedback:", error));
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = (
      feedback.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.feedback.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feedback.companyInfo && 
       (feedback.companyInfo.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.companyInfo.sigla?.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const matchesTab = activeTab === "answered" ? feedback.answered : !feedback.answered;

    return matchesSearch && matchesTab;
  });

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: ptBR });
  };

  if (loading) {
    return <LoadingState label="A carregar feedback..." />;
  }

  return (
    <AdminPage>
      <AdminPageHeader title="Feedback" description="Acompanhe e responda às mensagens enviadas pelos utilizadores." />
      
      <AdminCard className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex border-b border-gray-200 w-full">
            <button
              className={`py-2 px-4 font-medium ${activeTab === "unanswered" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
              onClick={() => setActiveTab("unanswered")}
            >
              Não Respondidos
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {feedbacks.filter(f => !f.answered).length}
              </span>
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === "answered" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
              onClick={() => setActiveTab("answered")}
            >
              Respondidos
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {feedbacks.filter(f => f.answered).length}
              </span>
            </button>
          </div>
          
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Pesquisar feedbacks..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute right-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
        </div>

        <div className="grid gap-6">
          {filteredFeedbacks.length > 0 ? (
            filteredFeedbacks.map((item) => (
              <div 
                key={item.id} 
                className={`border-l-4 ${item.answered ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-gray-50'} p-5 rounded-r-lg hover:shadow-md transition-shadow`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start mb-2 gap-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{item.nome}</h3>
                    <p className="text-sm text-gray-600">{item.email}</p>
                    {item.companyInfo && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">
                          Empresa: {item.companyInfo.nome || 'Empresa não identificada'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Email: {item.companyInfo.email}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                      {formatDate(item.timestamp)}
                    </span>
                    {item.answered && item.answeredAt && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Respondido em: {formatDate(item.answeredAt)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div 
                  className="prose max-w-none text-gray-700 mt-3"
                  dangerouslySetInnerHTML={{ __html: item.feedback }}
                />
                
                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                  {!item.answered ? (
                    <button 
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      onClick={() => handleMarkAsAnswered(item.id, item.userId)}
                    >
                      Marcar como Respondido
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded">
                      Feedback Respondido
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchTerm 
                ? "Nenhum feedback encontrado para o termo pesquisado" 
                : activeTab === "answered" 
                  ? "Nenhum feedback respondido ainda"
                  : "Nenhum feedback não respondido"}
            </div>
          )}
        </div>
      </AdminCard>
    </AdminPage>
  );
};

export default FeedbackDashboard;
