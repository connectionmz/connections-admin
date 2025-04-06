import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { db } from '../fb';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Publicidade = () => {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editPostId, setEditPostId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  // Módulos e configuração do ReactQuill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link'
  ];

  // Carregar posts ao montar o componente
  useEffect(() => {
    const postsRef = ref(db, 'blogPost');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPosts(postsArray);
      } else {
        setPosts([]);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Função para salvar ou atualizar um post
  const savePost = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Título e conteúdo são obrigatórios!");
      return;
    }

    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    const postData = {
      title,
      content,
      date,
      time,
    };

    try {
      if (editPostId) {
        const postRef = ref(db, `blogPost/${editPostId}`);
        await update(postRef, postData);
        setEditPostId(null);
      } else {
        const newPostRef = push(ref(db, 'blogPost'));
        await set(newPostRef, postData);
      }
      
      // Limpar os campos após salvar
      setTitle('');
      setContent('');
      setActiveTab('list');
    } catch (error) {
      console.error('Erro ao salvar o post:', error);
      alert('Erro ao salvar o post. Por favor, tente novamente.');
    }
  };

  // Função para editar um post
  const editPost = (post) => {
    setTitle(post.title);
    setContent(post.content);
    setEditPostId(post.id);
    setActiveTab('edit');
  };

  // Função para deletar um post com confirmação
  const deletePost = async (postId) => {
    if (window.confirm('Tem certeza que deseja excluir este post?')) {
      try {
        const postRef = ref(db, `blogPost/${postId}`);
        await remove(postRef);
      } catch (error) {
        console.error('Erro ao deletar o post:', error);
        alert('Erro ao deletar o post. Por favor, tente novamente.');
      }
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6">Gerenciamento de Posts</h1>

      {/* Abas */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'list' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-blue-600 hover:bg-gray-200'
          }`}
        >
          Listar Posts
        </button>
        <button
          onClick={() => {
            setEditPostId(null);
            setActiveTab('edit');
          }}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'edit' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-blue-600 hover:bg-gray-200'
          }`}
        >
          {editPostId ? 'Editar Post' : 'Novo Post'}
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div>
        {activeTab === 'list' && (
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p>Nenhum post encontrado.</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                  <div 
                    className="prose max-w-none mb-4" 
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  <p className="text-sm text-gray-500 mb-2">
                    Publicado em: {post.date} às {post.time}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editPost(post)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editPostId ? 'Editar Post' : 'Criar Novo Post'}
            </h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Título</label>
              <input
                type="text"
                placeholder="Digite o título do post"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Conteúdo</label>
              <ReactQuill
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                theme="snow"
                className="border rounded"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setActiveTab('list');
                  setEditPostId(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePost}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                {editPostId ? 'Atualizar Post' : 'Publicar Post'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Publicidade;