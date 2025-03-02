import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';

const Publicidade = () => {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editPostId, setEditPostId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState('');

  // Carregar posts ao montar o componente
  useEffect(() => {
    const postsRef = ref(db, 'blogPost');
    onValue(postsRef, (snapshot) => {
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
  }, []);

// Função para fazer upload da imagem
const handleImageUpload = async (file) => {
  if (!file) return;
  const fileRef = storageRef(storage, `images/${file.name}`);
  
  try {
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setImageURL(url);  // Atualiza o estado com a URL da imagem
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
  }
};

// Função para salvar ou atualizar um post
const savePost = async () => {
  if (!title.trim() || !content.trim()) {
    alert("Título e conteúdo são obrigatórios!");
    return;
  }

  // Captura a data e hora atuais
  const now = new Date();
  const date = now.toLocaleDateString(); // Formato: DD/MM/YYYY
  const time = now.toLocaleTimeString(); // Formato: HH:MM:SS

  const postData = {
    title,
    content,
    imageURL,  // Garantir que a URL da imagem está sendo armazenada
    date, // Adiciona a data de publicação
    time, // Adiciona a hora de publicação
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
    setImage(null);
    setImageURL('');  // Limpar a URL da imagem
    setActiveTab('list');
  } catch (error) {
    console.error('Erro ao salvar o post:', error);
  }
};


  // Função para editar um post
  const editPost = (post) => {
    setTitle(post.title);
    setContent(post.content);
    setImageURL(post.imageURL || '');
    setEditPostId(post.id);
    setActiveTab('edit');
  };

  // Função para deletar um post
  const deletePost = async (postId) => {
    const postRef = ref(db, `blogPost/${postId}`);
    await remove(postRef);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6">Blog</h1>

      {/* Abas */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded ${activeTab === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
        >
          Listar Posts
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 rounded ${activeTab === 'edit' ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}
        >
          {editPostId ? 'Editar Post' : 'Adicionar Post'}
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div>
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
                {post.imageURL && (
                  <img
                    src={post.imageURL}
                    alt={post.title}
                    className="w-full h-48 object-cover rounded mb-4"
                  />
                )}
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <p className="text-gray-700 mb-4">{post.content}</p>
                <p className="text-sm text-gray-500 mb-2">
                  Publicado em: {post.date} às {post.time}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editPost(post)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editPostId ? 'Editar Post' : 'Adicionar Post'}
            </h2>
            <input
              type="text"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
            <textarea
              placeholder="Conteúdo"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              rows="4"
            />
            <input
              type="file"
              onChange={(e) => {
                setImage(e.target.files[0]);
                handleImageUpload(e.target.files[0]);
              }}
              className="w-full p-2 border rounded mb-4"
            />
            {imageURL && (
              <img
                src={imageURL}
                alt="Preview"
                className="w-full h-48 object-cover rounded mb-4"
              />
            )}
            <button
              onClick={savePost}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {editPostId ? 'Atualizar Post' : 'Adicionar Post'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Publicidade;