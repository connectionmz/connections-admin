import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Publicidade = () => {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  // Módulos e configuração do ReactQuill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
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
        // Ordenar posts por data (mais recente primeiro)
        postsArray.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB - dateA;
        });
        setPosts(postsArray);
      } else {
        setPosts([]);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Manipulador de upload de imagem
  const handleImageUpload = async (file) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      const fileRef = storageRef(storage, `blogImages/${file.name}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Por favor, tente novamente.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Função para salvar ou atualizar um post
  const savePost = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Título e conteúdo são obrigatórios!");
      return;
    }

    const now = new Date();
    const date = now.toLocaleDateString('pt-BR'); // Formato brasileiro
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    try {
      let imageUrlToSave = imageUrl;
      
      // Se há uma nova imagem para upload
      if (image) {
        imageUrlToSave = await handleImageUpload(image);
      }

      const postData = {
        title,
        content,
        date,
        time,
        ...(imageUrlToSave && { imageUrl: imageUrlToSave }), // Só inclui imageUrl se existir
        timestamp: now.getTime() // Adiciona timestamp para ordenação
      };

      if (editPostId) {
        const postRef = ref(db, `blogPost/${editPostId}`);
        await update(postRef, postData);
        setEditPostId(null);
      } else {
        const newPostRef = push(ref(db, 'blogPost'));
        await set(newPostRef, postData);
      }
      
      // Limpar os campos após salvar
      resetForm();
      setActiveTab('list');
    } catch (error) {
      console.error('Erro ao salvar o post:', error);
      alert('Erro ao salvar o post. Por favor, tente novamente.');
    }
  };

  // Função para resetar o formulário
  const resetForm = () => {
    setTitle('');
    setContent('');
    setImage(null);
    setImagePreview(null);
    setImageUrl('');
  };

  // Função para editar um post
  const editPost = (post) => {
    setTitle(post.title);
    setContent(post.content);
    setImageUrl(post.imageUrl || '');
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

  // Manipulador de seleção de imagem
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setImageUrl(''); // Limpa a URL existente se estiver editando
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6">Gerenciamento de Posts</h1>

      {/* Abas */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => {
            setActiveTab('list');
            if (editPostId) resetForm();
          }}
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
            resetForm();
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
                  {post.imageUrl && (
                    <div className="mb-4">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        className="max-h-64 w-full object-cover rounded"
                        onError={(e) => {
                          e.target.src = '/placeholder-blog.jpg';
                        }}
                      />
                    </div>
                  )}
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
              <label className="block text-gray-700 mb-2">Título *</label>
              <input
                type="text"
                placeholder="Digite o título do post"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Imagem de destaque</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(imagePreview || imageUrl) && (
                <div className="mt-2">
                  <img 
                    src={imagePreview || imageUrl} 
                    alt="Preview" 
                    className="max-h-48 rounded"
                  />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Conteúdo *</label>
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
                  resetForm();
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePost}
                disabled={isUploading || !title.trim() || !content.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Enviando...' : editPostId ? 'Atualizar Post' : 'Publicar Post'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Publicidade;