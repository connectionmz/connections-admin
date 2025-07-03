export default function ChangePassword() {  

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4 text-center">Alterar Senha</h2>
            <form>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                <input
                type="password"
                placeholder="Digite sua senha atual"
                className="border p-2 rounded-lg w-full border-gray-300 focus:border-blue-500"
                />
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                type="password"
                placeholder="Digite sua nova senha"
                className="border p-2 rounded-lg w-full border-gray-300 focus:border-blue-500"
                />
            </div>
            <button
                type="submit"
                className="bg-blue-500 text-white p-2 rounded-lg w-full hover:bg-blue-600"
            >
                Alterar Senha
            </button>
            </form>
        </div>
        </div>
    );
    }   