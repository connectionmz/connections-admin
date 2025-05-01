import React from 'react';

const Pagar = () => {

  return (
    <div className="flex h-screen">
      {/* Menu lateral */}
      <aside className="w-1/5 bg-gray-100 p-4 space-y-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-10 bg-white rounded shadow" />
        ))}
      </aside>
      {/* Conteúdo principal */}
      <main className="flex-1 p-6">
        {/* Barra de pesquisa */}
        <div className="flex mb-6">
          <input
            type="text"
            placeholder="Pesquisar..."
            className="flex-1 p-2 border rounded-l-md border-gray-300 focus:outline-none"/>
          <button className="px-4 bg-blue-500 text-white rounded-r-md">
            🔍
          </button>
        </div>
        {/* Método de pagamento */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Método de pagamento</label>
          <select className="w-full p-2 border border-gray-300 rounded">
            <option>M-pesa</option>
            <option>e-Mola</option>
            <option>Transferência Bancária</option>
          </select>
        </div>
        {/* Comprovativo */}
        <div>
          <label className="block mb-1 font-medium">Comprovativo</label>
          <input
            type="file"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      </main>
    </div>
  );
};
export default Pagar;
