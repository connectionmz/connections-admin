const Dashboard = () =>{
    return(<>
     {/* Conteúdo Principal */}
     <div className="flex-1 p-6">
          <div className="max-w-screen-xl mx-auto bg-white rounded-xl p-8 shadow-lg">
            {/* Título e botão de exportação */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Estatisticas Gerais</h1>
                <p className="text-sm text-gray-400">2024</p>
              </div>
              <div>
                <button className="bg-black text-white py-2 px-4 rounded-lg">
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Resumo financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-black text-white p-6 rounded-lg">
                <h2 className="text-xl font-semibold">Pagamentos de planos</h2>
                <p className="text-3xl font-bold">$16.4K</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-lg">
                <h2 className="text-xl font-semibold">Pagamentos de Publicidades</h2>
                <p className="text-3xl font-bold">$6.4K</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-lg">
                <h2 className="text-xl font-semibold">Empresas Cadastradas</h2>
                <p className="text-3xl font-bold">400</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-100 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Sales Funnel</h2>
                <div className="h-52 bg-gray-200 rounded-lg flex items-end p-4">
                  <div className="w-1/6 bg-gray-400 h-24 mx-2 rounded-lg"></div>
                  <div className="w-1/6 bg-gray-400 h-32 mx-2 rounded-lg"></div>
                  <div className="w-1/6 bg-green-500 h-48 mx-2 rounded-lg"></div>
                  <div className="w-1/6 bg-gray-400 h-28 mx-2 rounded-lg"></div>
                  <div className="w-1/6 bg-gray-400 h-36 mx-2 rounded-lg"></div>
                  <div className="w-1/6 bg-gray-400 h-20 mx-2 rounded-lg"></div>
                </div>
              </div>

              <div className="bg-gray-100 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Estatisticas</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-400 p-4 rounded-lg">3 Cotacoes</div>
                  <div className="bg-green-500 p-4 rounded-lg">15 Publicidades</div>
                  <div className="bg-gray-400 p-4 rounded-lg">12 Concursos</div>
                  <div className="bg-gray-400 p-4 rounded-lg">WhatsApp</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">{}</h2>
              <p className="text-3xl font-bold">{}</p>
            </div>
          </div>
        </div>
</>)
}
export default Dashboard